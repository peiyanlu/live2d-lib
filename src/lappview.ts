import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix'
import LAppDefine, { ViewLogical, ViewLogicalMax, ViewScale } from './lappdefine'
import { LAppDelegate } from './lappdelegate'
import { LAppLive2DManager } from './lapplive2dmanager'
import { LAppPal } from './lapppal'
import { LAppSprite } from './lappsprite'
import { TextureInfo } from './lapptexturemanager'
import { TouchManager } from './touchmanager'

/**
 * 绘图类。
 */
export class LAppView {
  private readonly touchManager: TouchManager // 触摸管理器
  private readonly deviceToScreen: CubismMatrix44 // 设备到屏幕矩阵
  private readonly viewMatrix: CubismViewMatrix // viewMatrix
  private readonly sprites: LAppSprite[] = [] // 纹理对象
  private programId?: WebGLProgram // 着色器标识
  public released: boolean = false // 是否已释放
  
  /**
   * 构造 函数
   */
  constructor() {
    this.programId = null
    this.released = false
    
    // 触摸相关事件管理
    this.touchManager = new TouchManager()
    
    // 用于从设备坐标转换为屏幕坐标
    this.deviceToScreen = new CubismMatrix44()
    
    // 缩放和转换屏幕显示移动的矩阵
    this.viewMatrix = new CubismViewMatrix()
  }
  
  /**
   * 初始化。
   */
  public initialize(): void {
    const { width, height } = LAppDelegate.canvas
    
    const ratio: number = width / height
    const left: number = -ratio ?? ViewLogical.Left
    const right: number = ratio ?? ViewLogical.Right
    const bottom: number = ViewLogical.Bottom
    const top: number = ViewLogical.Top
    
    // 与设备相对应的屏幕范围。X左端、X右端、Y下端、Y上端
    this.viewMatrix.setScreenRect(left, right, bottom, top)
    this.viewMatrix.scale(LAppDefine.scale, LAppDefine.scale)
    
    this.deviceToScreen.loadIdentity()
    if (width > height) {
      const screenW: number = Math.abs(right - left)
      this.deviceToScreen.scaleRelative(screenW / width, -screenW / width)
    } else {
      const screenH: number = Math.abs(top - bottom)
      this.deviceToScreen.scaleRelative(screenH / height, -screenH / height)
    }
    this.deviceToScreen.translateRelative(-width * 0.5, -height * 0.5)
    
    // 设置显示范围
    this.viewMatrix.setMaxScale(ViewScale.Max) // 边际扩张率
    this.viewMatrix.setMinScale(ViewScale.Min) // 边际减量率
    
    // 可显示的最大范围
    this.viewMatrix.setMaxScreenRect(
      ViewLogicalMax.Left,
      ViewLogicalMax.Right,
      ViewLogicalMax.Bottom,
      ViewLogicalMax.Top,
    )
  }
  
  /**
   * 释放资源
   */
  public release(): void {
    this.sprites.forEach(s => s.release())
    this.sprites.length = 0
    
    LAppDelegate.gl.deleteProgram(this.programId)
    this.released = true
  }
  
  /**
   * 渲染。
   */
  public render(): void {
    const gl = LAppDelegate.gl
    gl.useProgram(this.programId)
    
    this.sprites.forEach(s => s.render(this.programId))
    
    gl.flush()
    
    LAppLive2DManager.instance.setViewMatrix(this.viewMatrix)
    LAppLive2DManager.instance.onUpdate()
  }
  
  public addSprite(
    imgPath: string,
    position?: { x: number, y: number },
    size?: { width: number, height: number },
    hitCallback?: () => void,
  ) {
    // 齿轮图像初始化
    LAppDelegate.instance.textureManager.createTextureFromPngFile(
      imgPath,
      false,
      (textureInfo: TextureInfo): void => {
        const { width, height } = LAppDelegate.canvas
        const x: number = position ? position.x : width - textureInfo.width * 0.5
        const y: number = position ? position.y : height - textureInfo.height * 0.5
        
        const fWidth: number = size? size.width : textureInfo.width
        const fHeight: number = size? size.height : textureInfo.height
        
        const sprite = new LAppSprite(x, y, fWidth, fHeight, textureInfo.id, hitCallback)
        
        this.sprites.push(sprite)
      },
    )
  }
  
  /**
   * 初始化映像。
   */
  public initializeSprite(): void {
    // 创建着色器
    this.programId = LAppDelegate.instance.createShader()
  }
  
  /**
   * 触摸时调用。
   *
   * @param pointX 屏幕 X 坐标
   * @param pointY 屏幕 Y 坐标
   */
  public onTouchesBegan(pointX: number, pointY: number): void {
    this.touchManager.touchesBegan(pointX, pointY)
  }
  
  /**
   * 当指针在触摸时移动时调用。
   *
   * @param pointX 屏幕 X 坐标
   * @param pointY 屏幕 Y 坐标
   */
  public onTouchesMoved(pointX: number, pointY: number): void {
    const viewX: number = this.transformViewX(this.touchManager.getX())
    const viewY: number = this.transformViewY(this.touchManager.getY())
    
    this.touchManager.touchesMoved(pointX, pointY)
    
    LAppLive2DManager.instance.onDrag(viewX, viewY)
  }
  
  /**
   * 触摸完成后调用。
   *
   * @param pointX 屏幕 X 坐标
   * @param pointY 屏幕 Y 坐标
   */
  public onTouchesEnded(pointX: number, pointY: number): void {
    // 触摸退出
    LAppLive2DManager.instance.onDrag(0.0, 0.0)
    
    {
      // 单击键
      const x: number = this.deviceToScreen.transformX(this.touchManager.getX()) // 获取由逻辑坐标转换的坐标。
      const y: number = this.deviceToScreen.transformY(this.touchManager.getY()) // 逻辑坐标获取更改的坐标。
      
      if ('ontouchend' in LAppDelegate.canvas) {
        LAppPal.printMessage(`[APP]touchesEnded x: ${ x } y: ${ y }`)
      }
      LAppLive2DManager.instance.onTap(x, y)
      
      // 你点击了吗？
      this.sprites.forEach(s => {
        if (s.isHit(pointX, pointY)) {
          s.hitCallback()
        }
      })
    }
  }
  
  /**
   * 将 X 坐标转换为视图坐标。
   *
   * @param deviceX 设备 X 坐标
   */
  public transformViewX(deviceX: number): number {
    const screenX: number = this.deviceToScreen.transformX(deviceX) // 論理座標変換した座標を取得。
    return this.viewMatrix.invertTransformX(screenX) // 拡大、縮小、移動後の値。
  }
  
  /**
   * 将 Y 坐标转换为查看坐标。
   *
   * @param deviceY 设备 Y 坐标
   */
  public transformViewY(deviceY: number): number {
    const screenY: number = this.deviceToScreen.transformY(deviceY) // 論理座標変換した座標を取得。
    return this.viewMatrix.invertTransformY(screenY)
  }
  
  /**
   * 将 X 坐标转换为屏幕坐标。
   *
   * @param deviceX 设备 X 坐标
   */
  public transformScreenX(deviceX: number): number {
    return this.deviceToScreen.transformX(deviceX)
  }
  
  /**
   * 将 Y 坐标转换为屏幕坐标。
   *
   * @param deviceY 设备 Y 坐标
   */
  public transformScreenY(deviceY: number): number {
    return this.deviceToScreen.transformY(deviceY)
  }
}
