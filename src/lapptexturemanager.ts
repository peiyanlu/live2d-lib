import { csmVector, iterator } from '@framework/type/csmvector'

import { LAppDelegate } from './lappdelegate'

/**
 * 纹理管理类
 * 加载和管理图像的类。
 */
export class LAppTextureManager {
  textures: csmVector<TextureInfo>
  
  /**
   * 构造 函数
   */
  constructor() {
    this.textures = new csmVector<TextureInfo>()
  }
  
  /**
   * 解放。
   */
  public release(): void {
    for (
      let ite: iterator<TextureInfo> = this.textures.begin();
      ite.notEqual(this.textures.end());
      ite.preIncrement()
    ) {
      LAppDelegate.gl.deleteTexture(ite.ptr().id)
    }
    this.textures = new csmVector<TextureInfo>()
  }
  
  /**
   * 图像加载
   *
   * @param fileName 要导入的图像文件路径名
   * @param usePremultiply Premult是否要启用处理？
   * @param callback
   * @return 图像信息，加载失败时返回空值
   */
  public createTextureFromPngFile(
    fileName: string,
    usePremultiply: boolean,
    callback: (textureInfo: TextureInfo) => void,
  ): void {
    // search loaded texture already
    for (
      let ite: iterator<TextureInfo> = this.textures.begin();
      ite.notEqual(this.textures.end());
      ite.preIncrement()
    ) {
      if (
        ite.ptr().fileName == fileName &&
        ite.ptr().usePremultply == usePremultiply
      ) {
        // 缓存在第二次使用后使用（无需等待）
        // Web 工具包需要重新实例才能再次调用同一映像的加载
        // 细节：https://stackoverflow.com/a/5024181
        ite.ptr().img = new Image()
        ite.ptr().img.onload = (): void => callback(ite.ptr())
        ite.ptr().img.src = fileName
        return
      }
    }
    
    // 触发数据加载
    const img = new Image()
    img.onload = (): void => {
      const gl = LAppDelegate.gl
      // 创建纹理对象
      const tex: WebGLTexture = gl.createTexture()
      
      // 选择纹理
      gl.bindTexture(gl.TEXTURE_2D, tex)
      
      // 将像素写入纹理
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      
      // 让Premult这个过程完成
      if (usePremultiply) {
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
      }
      
      // 将像素写入纹理
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      
      // 生成 Mipmap
      gl.generateMipmap(gl.TEXTURE_2D)
      
      // テクスチャをバインド
      gl.bindTexture(gl.TEXTURE_2D, null)
      
      const textureInfo: TextureInfo = new TextureInfo()
      if (textureInfo != null) {
        textureInfo.fileName = fileName
        textureInfo.width = img.width
        textureInfo.height = img.height
        textureInfo.id = tex
        textureInfo.img = img
        textureInfo.usePremultply = usePremultiply
        this.textures.pushBack(textureInfo)
      }
      
      callback(textureInfo)
    }
    img.src = fileName
  }
  
  /**
   * 释放图像
   *
   * 释放阵列中的所有图像。
   */
  public releaseTextures(): void {
    for (let i = 0; i < this.textures.getSize(); i++) {
      this.textures.set(i, null)
    }
    
    this.textures.clear()
  }
  
  /**
   * 释放图像
   *
   * 释放指定纹理的图像。
   * @param texture 要释放的纹理
   */
  public releaseTextureByTexture(texture: WebGLTexture): void {
    for (let i = 0; i < this.textures.getSize(); i++) {
      if (this.textures.at(i).id != texture) {
        continue
      }
      
      this.textures.set(i, null)
      this.textures.remove(i)
      break
    }
  }
  
  /**
   * 释放图像
   *
   * 释放指定名称的映像。
   * @param fileName 解放する画像ファイルパス名
   */
  public releaseTextureByFilePath(fileName: string): void {
    for (let i = 0; i < this.textures.getSize(); i++) {
      if (this.textures.at(i).fileName == fileName) {
        this.textures.set(i, null)
        this.textures.remove(i)
        break
      }
    }
  }
}

/**
 * 图像信息结构
 */
export class TextureInfo {
  img: HTMLImageElement // 图像
  id: WebGLTexture = null // 质地
  width = 0 // 宽度
  height = 0 // 高度
  usePremultply: boolean // 是否要启用预置处理？
  fileName: string // 文件名
}
