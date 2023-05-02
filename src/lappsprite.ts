import { LAppDelegate } from './lappdelegate'

/**
 * 实现子画面的类
 *
 * 纹理 ID，矩形管理
 */
export class LAppSprite {
  texture: WebGLTexture // 质地
  vertexBuffer: WebGLBuffer // 顶点缓冲区
  uvBuffer: WebGLBuffer // uv顶点缓冲区
  indexBuffer: WebGLBuffer // 顶点索引缓冲区
  rect: Rect // 矩形
  
  positionLocation: number
  uvLocation: number
  textureLocation: WebGLUniformLocation
  
  positionArray: Float32Array
  uvArray: Float32Array
  indexArray: Uint16Array
  
  firstDraw: boolean
  hitCallback?: () => void
  
  /**
   * 构造 函数
   * @param x            x坐标
   * @param y            y坐标
   * @param width        宽度
   * @param height       高度
   * @param textureId    质地
   * @param hitCallback
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    textureId: WebGLTexture,
    hitCallback?: () => void
  ) {
    this.rect = new Rect()
    this.rect.left = x - width * 0.5
    this.rect.right = x + width * 0.5
    this.rect.up = y + height * 0.5
    this.rect.down = y - height * 0.5
    this.texture = textureId
    this.vertexBuffer = null
    this.uvBuffer = null
    this.indexBuffer = null
    
    this.positionLocation = null
    this.uvLocation = null
    this.textureLocation = null
    
    this.positionArray = null
    this.uvArray = null
    this.indexArray = null
    
    this.firstDraw = true
    
    this.hitCallback = hitCallback
  }
  
  /**
   * 解放。
   */
  public release(): void {
    this.rect = null
    
    const gl = LAppDelegate.gl
    gl.deleteTexture(this.texture)
    this.texture = null
    
    gl.deleteBuffer(this.uvBuffer)
    this.uvBuffer = null
    
    gl.deleteBuffer(this.vertexBuffer)
    this.vertexBuffer = null
    
    gl.deleteBuffer(this.indexBuffer)
    this.indexBuffer = null
  }
  
  /**
   * 返回纹理
   */
  public getTexture(): WebGLTexture {
    return this.texture
  }
  
  /**
   * 画。
   * @param programId 着色器程序
   */
  public render(programId: WebGLProgram): void {
    if (this.texture == null) {
      // 加载未完成
      return
    }
    
    const gl = LAppDelegate.gl
    // 首次绘制时
    if (this.firstDraw) {
      // 获取属性变量的数量
      this.positionLocation = gl.getAttribLocation(programId, 'position')
      gl.enableVertexAttribArray(this.positionLocation)
      
      this.uvLocation = gl.getAttribLocation(programId, 'uv')
      gl.enableVertexAttribArray(this.uvLocation)
      
      // 获取什么统一变量
      this.textureLocation = gl.getUniformLocation(programId, 'texture')
      
      // uniform注册属性
      gl.uniform1i(this.textureLocation, 0)
      
      // UV缓冲器，坐标初始化
      {
        this.uvArray = new Float32Array([ 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0 ])
        
        // 创建 UV 缓冲区
        this.uvBuffer = gl.createBuffer()
      }
      
      // 顶点缓冲区，坐标初始化
      {
        const maxWidth = LAppDelegate.canvas.width
        const maxHeight = LAppDelegate.canvas.height
        
        // 顶点数据
        this.positionArray = new Float32Array([
          (this.rect.right - maxWidth * 0.5) / (maxWidth * 0.5),
          (this.rect.up - maxHeight * 0.5) / (maxHeight * 0.5),
          (this.rect.left - maxWidth * 0.5) / (maxWidth * 0.5),
          (this.rect.up - maxHeight * 0.5) / (maxHeight * 0.5),
          (this.rect.left - maxWidth * 0.5) / (maxWidth * 0.5),
          (this.rect.down - maxHeight * 0.5) / (maxHeight * 0.5),
          (this.rect.right - maxWidth * 0.5) / (maxWidth * 0.5),
          (this.rect.down - maxHeight * 0.5) / (maxHeight * 0.5),
        ])
        
        // 创建顶点缓冲区
        this.vertexBuffer = gl.createBuffer()
      }
      
      // 顶点索引缓冲区， 初始化
      {
        // 索引数据
        this.indexArray = new Uint16Array([ 0, 1, 2, 3, 2, 0 ])
        
        // 创建索引缓冲区
        this.indexBuffer = gl.createBuffer()
      }
      
      this.firstDraw = false
    }
    
    // UV坐标注册
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.uvArray, gl.STATIC_DRAW)
    
    // attribute属性自注册
    gl.vertexAttribPointer(this.uvLocation, 2, gl.FLOAT, false, 0, 0)
    
    // 顶点坐标自注册
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.positionArray, gl.STATIC_DRAW)
    
    // attribute属性注册
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)
    
    // 创建顶点索引
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexArray, gl.DYNAMIC_DRAW)
    
    // 绘制模型
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.drawElements(gl.TRIANGLES, this.indexArray.length, gl.UNSIGNED_SHORT, 0,)
  }
  
  /**
   * 当たり判定
   * @param pointX x座標
   * @param pointY y座標
   */
  public isHit(pointX: number, pointY: number): boolean {
    // 获取屏幕尺寸。
    const { height } = LAppDelegate.canvas
    
    // 需要转换 Y 坐标
    const y = height - pointY
    
    return (
      pointX >= this.rect.left &&
      pointX <= this.rect.right &&
      y <= this.rect.up &&
      y >= this.rect.down
    )
  }
}

export class Rect {
  public left: number // 左辺
  public right: number // 右辺
  public up: number // 上辺
  public down: number // 下辺
}
