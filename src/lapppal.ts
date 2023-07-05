import LAppDefine from './lappdefine'

/**
 * Cubism Platform Abstraction Layer.抽象的平台相关功能
 *
 * 汇总与平台相关的功能，例如文件读取和时间检索。
 */
export class LAppPal {
  private static _currentFrame = 0.0
  private static _lastFrame = 0.0
  private static _deltaTime = 0.0
  
  /**
   * 将文件作为字节数据读取
   *
   * @param filePath 要读取的文件的路径
   * @param callback
   * @return
   * {
   *      buffer,   字节数据读取
   *      size        文件大小
   * }
   */
  public static loadFileAsBytes(filePath: string, callback: (arrayBuffer: ArrayBuffer, size: number) => void): void {
    fetch(filePath, { cache: 'no-cache' })
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => callback(arrayBuffer, arrayBuffer.byteLength))
  }
  
  /**
   * 获取增量时间（与上一帧的差异）
   * @return 增量时间 [毫秒]
   */
  public static getDeltaTime(): number {
    return this._deltaTime
  }
  
  public static updateTime(): void {
    this._currentFrame = Date.now()
    this._deltaTime = (this._currentFrame - this._lastFrame) / 1000
    this._lastFrame = this._currentFrame
  }
  
  /**
   * 打印消息
   * @param message 字符串
   */
  public static printMessage(message: string): void {
    if (LAppDefine.debug) {
      console.log(message)
    }
  }
}
