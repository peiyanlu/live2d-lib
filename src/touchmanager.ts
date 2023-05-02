export class TouchManager {
  startY: number // 启动触摸时 x 的值
  startX: number // 启动触摸时 y 的值
  lastX: number // x 在单点触摸上的值
  lastY: number // 单点触摸时的 Y 值
  lastX1: number // 双点触控时第一个 x 的值
  lastY1: number // 双点触摸时第一个 y 的值
  lastX2: number // 双点触控上第二个 x 的值
  lastY2: number // 双击时的第二个 y 值
  lastTouchDistance: number // 两个或多个手指之间的距离
  deltaX: number // x 从上一个值到当前值的距离。
  deltaY: number // 距离 y 已从上一个值移动到当前值。
  scale: number // 在此帧中要乘以的放大倍率。 1 放大操作期间除外。
  touchSingle: boolean // 适用于单点触控
  flipAvailable: boolean // 是否启用翻转
  
  /**
   * 构造 函数
   */
  constructor() {
    this.startX = 0.0
    this.startY = 0.0
    this.lastX = 0.0
    this.lastY = 0.0
    this.lastX1 = 0.0
    this.lastY1 = 0.0
    this.lastX2 = 0.0
    this.lastY2 = 0.0
    this.lastTouchDistance = 0.0
    this.deltaX = 0.0
    this.deltaY = 0.0
    this.scale = 1.0
    this.touchSingle = false
    this.flipAvailable = false
  }
  
  public getCenterX(): number {
    return this.lastX
  }
  
  public getCenterY(): number {
    return this.lastY
  }
  
  public getDeltaX(): number {
    return this.deltaX
  }
  
  public getDeltaY(): number {
    return this.deltaY
  }
  
  public getStartX(): number {
    return this.startX
  }
  
  public getStartY(): number {
    return this.startY
  }
  
  public getScale(): number {
    return this.scale
  }
  
  public getX(): number {
    return this.lastX
  }
  
  public getY(): number {
    return this.lastY
  }
  
  public getX1(): number {
    return this.lastX1
  }
  
  public getY1(): number {
    return this.lastY1
  }
  
  public getX2(): number {
    return this.lastX2
  }
  
  public getY2(): number {
    return this.lastY2
  }
  
  public isSingleTouch(): boolean {
    return this.touchSingle
  }
  
  public isFlickAvailable(): boolean {
    return this.flipAvailable
  }
  
  public disableFlick(): void {
    this.flipAvailable = false
  }
  
  /**
   * 触摸启动事件
   * @param deviceX 您触摸的屏幕上 x 的值
   * @param deviceY 您触摸的屏幕上 y 的值
   */
  public touchesBegan(deviceX: number, deviceY: number): void {
    this.lastX = deviceX
    this.lastY = deviceY
    this.startX = deviceX
    this.startY = deviceY
    this.lastTouchDistance = -1.0
    this.flipAvailable = true
    this.touchSingle = true
  }
  
  /**
   * 拖动事件
   * @param deviceX 您触摸的屏幕上 x 的值
   * @param deviceY 您触摸的屏幕上 y 的值
   */
  public touchesMoved(deviceX: number, deviceY: number): void {
    this.lastX = deviceX
    this.lastY = deviceY
    this.lastTouchDistance = -1.0
    this.touchSingle = true
  }
  
  /**
   * 轻拂距离测量
   * @return 轻拂距离
   */
  public getFlickDistance(): number {
    return this.calculateDistance(
      this.startX,
      this.startY,
      this.lastX,
      this.lastY,
    )
  }
  
  /**
   * 求从点 1 到点 2 的距离
   *
   * @param x1 第一个触摸屏幕上的 x 值
   * @param y1 第一个触摸屏幕上 y 值
   * @param x2 第二个触摸屏上的 x 值
   * @param y2 第二个触摸屏上的 y 值
   */
  public calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
  }
  
  /**
   * 从第两个值中，找到移动量。
   * 如果方向不同，则移动量为 0。 在同一方向上，参考具有较低绝对值的值。
   *
   * @param v1 第一次移动量
   * @param v2 第二次移动量
   *
   * @return 更小移动量
   */
  public calculateMovingAmount(v1: number, v2: number): number {
    if (v1 > 0.0 != v2 > 0.0) {
      return 0.0
    }
    
    const sign: number = v1 > 0.0 ? 1.0 : -1.0
    const absoluteValue1 = Math.abs(v1)
    const absoluteValue2 = Math.abs(v2)
    return (
      sign * (absoluteValue1 < absoluteValue2 ? absoluteValue1 : absoluteValue2)
    )
  }
}
