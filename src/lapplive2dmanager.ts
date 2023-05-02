import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { ACubismMotion } from '@framework/motion/acubismmotion'
import { csmVector } from '@framework/type/csmvector'
import path from 'path'

import LAppDefine, { HitArea, MotionGroup, Priority } from './lappdefine'

import { LAppDelegate } from './lappdelegate'
import { LAppModel } from './lappmodel'
import { LAppPal } from './lapppal'
import Live2dWidget from './main'

/**
 * 用于在示例应用程序中管理立体主义模型的类
 * 创建和销毁模型、处理点击事件以及切换模型。
 */
export class LAppLive2DManager {
  private readonly viewMatrix: CubismMatrix44 // 用于模型绘制的视图矩阵
  private readonly models: csmVector<LAppModel> // 模型实例容器
  private sceneIndex: number // 要显示的场景的索引值
  private static _instance: LAppLive2DManager = null
  
  public static get instance(): LAppLive2DManager {
    return this.initialize()
  }
  
  /**
   * 构造函数
   */
  constructor() {
    this.viewMatrix = new CubismMatrix44()
    this.models = new csmVector<LAppModel>()
    this.sceneIndex = 0
    this.changeScene(0)
  }
  
  // 运动播放结束回调函数
  _finishedMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage(`Motion Finished: OK`)
  }
  
  /**
   * 返回类的实例（单一实例）。
   * 如果尚未创建实例，请在内部实例化它。
   *
   * @return 类的实例
   */
  public static initialize(): LAppLive2DManager {
    if (this._instance == null) {
      this._instance = new LAppLive2DManager()
    }
    
    return this._instance
  }
  
  /**
   * 释放类的实例（单例）。
   */
  public static releaseInstance(): void {
    if (this._instance != null) {
      this._instance = void 0
    }
    
    this._instance = null
  }
  
  /**
   * 返回当前场景中持有的模型。
   *
   * @param no 模型列表中的索引值
   * @return 返回模型的实例。 如果索引值超出范围，则返回 NULL。
   */
  public getModel(no: number): LAppModel {
    if (no < this.models.getSize()) {
      return this.models.at(no)
    }
    
    return null
  }
  
  /**
   * 释放当前场景中的所有模型
   */
  public releaseAllModel(): void {
    for (let i = 0; i < this.models.getSize(); i++) {
      this.models.at(i).release()
      this.models.set(i, null)
    }
    
    this.models.clear()
  }
  
  /**
   * 拖动屏幕时会发生什么情况
   *
   * @param x 屏幕的 X 坐标
   * @param y 屏幕 Y 坐标
   */
  public onDrag(x: number, y: number): void {
    for (let i = 0; i < this.models.getSize(); i++) {
      const model: LAppModel = this.getModel(i)
      
      if (model) {
        model.setDragging(x, y)
      }
    }
  }
  
  /**
   * 点按屏幕后会发生什么情况
   *
   * @param x 屏幕的 X 坐标
   * @param y 屏幕 Y 坐标
   */
  public onTap(x: number, y: number): void {
    LAppPal.printMessage(`[APP]tap point: {x: ${ x.toFixed(2) } y: ${ y.toFixed(2) }}`)
    
    for (let i = 0; i < this.models.getSize(); i++) {
      const model = this.models.at(i)
      const count = model.modelSetting.getHitAreasCount()
      
      if (count === 0) {
        LAppPal.printMessage(`[APP]hit area: [${ HitArea.Other }]`)
        model.startRandomMotion(MotionGroup.Tap, Priority.Normal, this._finishedMotion)
        Live2dWidget.emit(HitArea.Other)
        return
      }
      
      if (model.hitTest(HitArea.Head, x, y)) {
        LAppPal.printMessage(`[APP]hit area: [${ HitArea.Head }]`)
        model.setRandomExpression()
        Live2dWidget.emit(HitArea.Head)
      } else if (model.hitTest(HitArea.Left, x, y)) {
        LAppPal.printMessage(`[APP]hit area: [${ HitArea.Body + HitArea.Left }]`)
        model.startRandomLeftHandMotion(MotionGroup.TapLeft, Priority.Normal, this._finishedMotion)
        Live2dWidget.emit(HitArea.Left)
      } else if (model.hitTest(HitArea.Right, x, y)) {
        LAppPal.printMessage(`[APP]hit area: [${ HitArea.Body + HitArea.Right }]`)
        model.startRandomRightHandMotion(MotionGroup.TapRight, Priority.Normal, this._finishedMotion)
        Live2dWidget.emit(HitArea.Right)
      } else if (model.hitTest(HitArea.Body, x, y)) {
        LAppPal.printMessage(`[APP]hit area: [${ HitArea.Body }]`)
        model.startRandomMotion(MotionGroup.TapBody, Priority.Normal, this._finishedMotion)
        Live2dWidget.emit(HitArea.Body)
      }
    }
  }
  
  /**
   * 刷新屏幕时会发生什么情况
   * 执行模型更新处理和图纸处理
   */
  public onUpdate(): void {
    const { width, height } = LAppDelegate.canvas
    
    const modelCount: number = this.models.getSize()
    
    for (let i = 0; i < modelCount; ++i) {
      const projection: CubismMatrix44 = new CubismMatrix44()
      const model: LAppModel = this.getModel(i)
      
      if (model.getModel()) {
        if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
          // 在垂直窗口中显示长水平模型时，请根据模型的水平大小计算比例。
          model.getModelMatrix().setWidth(2.0)
          projection.scale(1.0, width / height)
        } else {
          projection.scale(height / width, 1.0)
        }
        
        // 如有必要，请在此处乘法
        projection.multiplyByMatrix(this.viewMatrix)
      }
      
      model.update()
      model.draw(projection) // 由于它是通过引用传递的，因此投影会发生变化。
    }
  }
  
  /**
   * 切换到上一个场景
   * 在示例应用程序中，模型集已切换。
   */
  public prevScene(): void {
    const no: number = (this.sceneIndex - 1) % LAppDefine.source.models.length
    this.changeScene(no)
  }
  
  /**
   * 切换到下一个场景
   * 在示例应用程序中，模型集已切换。
   */
  public nextScene(): void {
    const no: number = (this.sceneIndex + 1) % LAppDefine.source.models.length
    this.changeScene(no)
  }
  
  /**
   * 在场景之间切换
   * 在示例应用程序中，模型集已切换。
   */
  public changeScene(index: number): void {
    this.sceneIndex = index
    LAppPal.printMessage(`[APP]model index: ${ this.sceneIndex }`)
    
    const model: string = LAppDefine.source.models.at(index)
    const modelPath: string = path.join(LAppDefine.source.path, model)
    let modelJsonName: string = `${ model }.model3.json`
    
    this.releaseAllModel()
    this.models.pushBack(new LAppModel())
    this.models.at(0).loadAssets(modelPath, modelJsonName)
  }
  
  public setViewMatrix(m: CubismMatrix44) {
    for (let i = 0; i < 16; i++) {
      this.viewMatrix.getArray()[i] = m.getArray()[i]
    }
  }
}
