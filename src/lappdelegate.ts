import { CubismFramework, LogLevel, Option } from '@framework/live2dcubismframework'

import LAppDefine, { doc } from './lappdefine'
import { LAppLive2DManager } from './lapplive2dmanager'
import { LAppPal } from './lapppal'
import { LAppTextureManager } from './lapptexturemanager'
import { LAppView } from './lappview'

/**
 * 应用程序类。
 * Cubism SDK管理
 */
export class LAppDelegate {
  private readonly cubismOption: Option // Cubism SDK Option
  public readonly view: LAppView // View信息
  public captured: boolean // 是否单击
  public readonly textureManager: LAppTextureManager // 纹理管理器
  private static _instance: LAppDelegate = null
  public static frameBuffer: WebGLFramebuffer = null
  public static canvas: HTMLCanvasElement = null
  public static gl: WebGLRenderingContext = null
  private readonly canvasId: string = 'live2d-canvas'
  
  /**
   * 获取一个类的实例。
   * 如果未生成实例，则在内部生成实例。
   * @return 类实例
   */
  static get instance(): LAppDelegate {
    if (this._instance == null) {
      this._instance = new LAppDelegate()
    }
    
    return this._instance
  }
  
  /**
   * 构造函数
   */
  constructor() {
    this.captured = false
    
    this.cubismOption = new Option()
    this.view = new LAppView()
    this.textureManager = new LAppTextureManager()
  }
  
  /**
   * 释放一个类的实例（单个）。
   */
  public static releaseInstance(): void {
    if (this._instance != null) {
      this._instance.release()
    }
    
    this._instance = null
  }
  
  /**
   * 初始化APP所需的东西。
   */
  public initialize(): boolean {
    // 创建画布
    const canvas = LAppDelegate.canvas = this.getCanvas()
    
    // 初始化gl上下文
    const gl = LAppDelegate.gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext)
    
    if (!gl) {
      alert('Cannot initialize WebGL. This browser does not support.')
      LAppDelegate.gl = null
      
      doc.body.innerHTML = 'This browser does not support the <code>&lt;canvas&gt;</code> element.'
      
      // gl 初始化失败
      return false
    }
    
    if (!LAppDelegate.frameBuffer) {
      LAppDelegate.frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING)
    }
    
    // 透明设置
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    
    // 事件绑定
    this.onEvent()
    
    // AppView 初始化
    this.view.initialize()
    
    // Cubism SDK 初始化
    this.initializeCubism()
    
    return true
  }
  
  public getCanvas() {
    let canvas = doc.querySelector<HTMLCanvasElement>(`#${ this.canvasId }`)
    
    if (!canvas) {
      canvas = doc.createElement('canvas')
      canvas.setAttribute('id', this.canvasId)
    } else {
      this.release()
    }
    
    if (LAppDefine.canvas === 'auto') {
      this._resizeCanvas()
    } else {
      canvas.width = LAppDefine.canvas.width || canvas.width
      canvas.height = LAppDefine.canvas.height || canvas.height
    }
    // 将画布添加到 DOM
    LAppDefine.target.appendChild(canvas)
    
    return canvas
  }
  
  // 鼠标和触摸事件注册
  private onEvent() {
    const canvas = LAppDelegate.canvas
    const supportTouch: boolean = 'ontouchend' in canvas
    
    if (supportTouch) {
      canvas.ontouchstart = onTouchBegan
      canvas.ontouchmove = onTouchMoved
      canvas.ontouchend = onTouchEnded
      canvas.ontouchcancel = onTouchEnded
    } else {
      canvas.onmousedown = onClickBegan
      canvas.onmousemove = onMouseMoved
      canvas.onmouseup = onClickEnded
    }
  }
  
  /**
   * 调整画布大小并重新初始化视图。
   */
  public onResize(): void {
    this._resizeCanvas()
    this.view.initialize()
    this.view.initializeSprite()
    
    // 传递画布大小
    const { width, height } = LAppDelegate.canvas
    LAppDelegate.gl.viewport(0, 0, width, height)
  }
  
  /**
   * 释放资源。
   */
  public release(): void {
    this.textureManager.release()
    // this.textureManager = null
    
    this.view.release()
    // this.view = null
    
    // 释放资源
    LAppLive2DManager.releaseInstance()
    
    // 释放 Cubism SDK
    CubismFramework.dispose()
  }
  
  /**
   * 执行处理。
   */
  public run(): void {
    // 主循环
    const loop = (): void => {
      // 检查实例是否存在
      if (LAppDelegate.instance == null) {
        return
      }
      
      // 時間更新
      LAppPal.updateTime()
      
      const gl = LAppDelegate.gl
      // 屏幕初始化
      gl.clearColor(0.0, 0.0, 0.0, 0)
      
      // 启用深度测试
      gl.enable(gl.DEPTH_TEST)
      
      // 附近的物体 远处的模糊物体
      gl.depthFunc(gl.LEQUAL)
      
      // 清除颜色和深度缓冲区
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      
      gl.clearDepth(1.0)
      
      // 透过设定
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      
      // 图形更新
      this.view.render()
      
      // 循环的递归调用
      requestAnimationFrame(loop)
    }
    loop()
  }
  
  /**
   * 注册着色器。
   */
  public createShader(): WebGLProgram {
    const gl = LAppDelegate.gl
    
    // 编译顶点着色器
    const vertexShaderId = gl.createShader(gl.VERTEX_SHADER)
    
    if (vertexShaderId === null) {
      LAppPal.printMessage('failed to create vertexShader')
      return null
    }
    
    const vertexShader: string =
      `
        precision mediump float;
        attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vuv;
        void main(void)
        {
           gl_Position = vec4(position, 1.0);
           vuv = uv;
        }
      `
    
    gl.shaderSource(vertexShaderId, vertexShader)
    gl.compileShader(vertexShaderId)
    
    // 编译片段着色器
    const fragmentShaderId = gl.createShader(gl.FRAGMENT_SHADER)
    
    if (fragmentShaderId == null) {
      LAppPal.printMessage('failed to create fragmentShader')
      return null
    }
    
    const fragmentShader: string =
      `
        precision mediump float;
        varying vec2 vuv;
        uniform sampler2D texture;
        void main(void)
        {
           gl_FragColor = texture2D(texture, vuv);
        }
      `
    
    gl.shaderSource(fragmentShaderId, fragmentShader)
    gl.compileShader(fragmentShaderId)
    
    // 创建程序对象
    const programId = gl.createProgram()
    gl.attachShader(programId, vertexShaderId)
    gl.attachShader(programId, fragmentShaderId)
    
    gl.deleteShader(vertexShaderId)
    gl.deleteShader(fragmentShaderId)
    
    // 链接
    gl.linkProgram(programId)
    
    gl.useProgram(programId)
    
    return programId
  }
  
  /**
   * 初始化 Cubism SDK
   */
  public initializeCubism(): void {
    // setup cubism
    this.cubismOption.logFunction = LAppPal.printMessage
    this.cubismOption.loggingLevel = LogLevel.LogLevel_Error
    CubismFramework.startUp(this.cubismOption)
    
    // initialize cubism
    CubismFramework.initialize()
    
    // load model
    LAppLive2DManager.initialize()
    
    LAppPal.updateTime()
    
    this.view.initializeSprite()
  }
  
  /**
   * 调整画布大小以填充屏幕。
   */
  private _resizeCanvas(): void {
    LAppDelegate.canvas.width = window.innerWidth
    LAppDelegate.canvas.height = window.innerHeight
  }
}

/**
 * 点击开始时
 */
function onClickBegan(e: MouseEvent): void {
  LAppDelegate.instance.captured = true
  
  if (LAppDelegate.instance.view.released) {
    LAppPal.printMessage('view released')
    return
  }
  
  const rect = (e.target as Element).getBoundingClientRect()
  const posX: number = e.pageX - rect.left
  const posY: number = e.pageY - rect.top
  
  LAppDelegate.instance.view.onTouchesBegan(posX, posY)
}

/**
 * 当鼠标指针移动时
 */
function onMouseMoved(e: MouseEvent): void {
  if (!LAppDelegate.instance.captured) {
    return
  }
  
  if (LAppDelegate.instance.view.released) {
    LAppPal.printMessage('view released')
    return
  }
  
  const rect = (e.target as Element).getBoundingClientRect()
  const posX: number = e.clientX - rect.left
  const posY: number = e.clientY - rect.top
  
  LAppDelegate.instance.view.onTouchesMoved(posX, posY)
}

/**
 * 点击结束时
 */
function onClickEnded(e: MouseEvent): void {
  LAppDelegate.instance.captured = false
  
  if (LAppDelegate.instance.view.released) {
    LAppPal.printMessage('view released')
    return
  }
  
  const rect = (e.target as Element).getBoundingClientRect()
  const posX: number = e.clientX - rect.left
  const posY: number = e.clientY - rect.top
  
  LAppDelegate.instance.view.onTouchesEnded(posX, posY)
}

/**
 * 触摸开始时
 */
function onTouchBegan(e: TouchEvent): void {
  LAppDelegate.instance.captured = true
  
  if (LAppDelegate.instance.view.released) {
    LAppPal.printMessage('view released')
    return
  }
  
  const rect = (e.target as Element).getBoundingClientRect()
  const posX: number = e.changedTouches[0].clientX - rect.left
  const posY: number = e.changedTouches[0].clientY - rect.top
  
  LAppDelegate.instance.view.onTouchesBegan(posX, posY)
}

/**
 * 当触摸移动时
 */
function onTouchMoved(e: TouchEvent): void {
  if (!LAppDelegate.instance.captured) {
    return
  }
  
  if (LAppDelegate.instance.view.released) {
    LAppPal.printMessage('view released')
    return
  }
  
  const rect = (e.target as Element).getBoundingClientRect()
  
  const posX = e.changedTouches[0].clientX - rect.left
  const posY = e.changedTouches[0].clientY - rect.top
  
  LAppDelegate.instance.view.onTouchesMoved(posX, posY)
}

/**
 * 触摸结束时
 * 触摸取消时
 */
function onTouchEnded(e: TouchEvent): void {
  LAppDelegate.instance.captured = false
  
  if (LAppDelegate.instance.view.released) {
    LAppPal.printMessage('view released')
    return
  }
  
  const rect = (e.target as Element).getBoundingClientRect()
  
  const posX = e.changedTouches[0].clientX - rect.left
  const posY = e.changedTouches[0].clientY - rect.top
  
  LAppDelegate.instance.view.onTouchesEnded(posX, posY)
}
