import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid'
import { CubismModelSettingJson } from '@framework/cubismmodelsettingjson'
import { BreathParameterData, CubismBreath } from '@framework/effect/cubismbreath'
import { CubismEyeBlink } from '@framework/effect/cubismeyeblink'
import { ICubismModelSetting } from '@framework/icubismmodelsetting'
import { CubismIdHandle } from '@framework/id/cubismid'
import { CubismFramework } from '@framework/live2dcubismframework'
import { CubismMatrix44 } from '@framework/math/cubismmatrix44'
import { CubismUserModel } from '@framework/model/cubismusermodel'
import { ACubismMotion, FinishedMotionCallback } from '@framework/motion/acubismmotion'
import { CubismMotion } from '@framework/motion/cubismmotion'
import { CubismMotionManager } from '@framework/motion/cubismmotionmanager'
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue,
} from '@framework/motion/cubismmotionqueuemanager'
import { csmMap } from '@framework/type/csmmap'
import { csmRect } from '@framework/type/csmrectf'
import { csmString } from '@framework/type/csmstring'
import { csmVector } from '@framework/type/csmvector'
import { CubismLogError, CubismLogInfo } from '@framework/utils/cubismdebug'

import path from 'path'

import { MotionGroup, Priority } from './lappdefine'
import { LAppDelegate } from './lappdelegate'
import { LAppPal } from './lapppal'
import { TextureInfo } from './lapptexturemanager'
import { LAppWavFileHandler } from './lappwavfilehandler'
import { CubismIdManager } from '@framework/id/cubismidmanager'

enum LoadStep {
  LoadAssets,
  LoadModel,
  WaitLoadModel,
  LoadExpression,
  WaitLoadExpression,
  LoadPhysics,
  WaitLoadPhysics,
  LoadPose,
  WaitLoadPose,
  SetupEyeBlink,
  SetupBreath,
  LoadUserData,
  WaitLoadUserData,
  SetupEyeBlinkIds,
  SetupLipSyncIds,
  SetupLayout,
  LoadMotion,
  WaitLoadMotion,
  CompleteInitialize,
  CompleteSetupModel,
  LoadTexture,
  WaitLoadTexture,
  CompleteSetup
}

/**
 * <br>用户实际使用的模型的实现类
 * 生成模型，生成功能组件，并调用更新和渲染。
 */
export class LAppModel extends CubismUserModel {
  modelSetting: ICubismModelSetting // 模型设置信息
  modelHomeDir: string // 模型设置所在的目录
  userTimeSeconds: number // 增量时间总和 [秒]
  
  eyeBlinkIds: csmVector<CubismIdHandle> // 为模型设置的闪烁函数的参数 ID
  lipSyncIds: csmVector<CubismIdHandle> // 为模型设置口型同步参数 ID
  
  motions: csmMap<string, ACubismMotion> // 加载的议案列表
  expressions: csmMap<string, ACubismMotion> // 加载的面部表情列表
  
  _hitArea: csmVector<csmRect>
  _userArea: csmVector<csmRect>
  
  idParamAngleX: CubismIdHandle // 参数ID: ParamAngleX
  idParamAngleY: CubismIdHandle // 参数ID: ParamAngleY
  idParamAngleZ: CubismIdHandle // 参数ID: ParamAngleZ
  idParamEyeBallX: CubismIdHandle // 参数ID: ParamEyeBallX
  idParamEyeBallY: CubismIdHandle // 参数ID: ParamEyeBAllY
  idParamBodyAngleX: CubismIdHandle // 参数ID: ParamBodyAngleX
  
  state: number // 用于当前状态管理
  expressionCount: number // 面部表情数据计数
  textureCount: number // 纹理计数
  motionCount: number // 运动数据计数
  allMotionCount: number // 总动量
  wavFileHandler: LAppWavFileHandler //WAV 文件处理程序
  
  private readonly _rightArmMotionManager: CubismMotionManager
  private readonly _leftArmMotionManager: CubismMotionManager
  
  private get model() {
    return this._model
  }
  
  /**
   * 构造 函数
   */
  public constructor() {
    super()
    
    this.modelSetting = null
    this.modelHomeDir = null
    this.userTimeSeconds = 0.0
    
    this.eyeBlinkIds = new csmVector<CubismIdHandle>()
    this.lipSyncIds = new csmVector<CubismIdHandle>()
    
    this.motions = new csmMap<string, ACubismMotion>()
    this.expressions = new csmMap<string, ACubismMotion>()
    
    this._hitArea = new csmVector<csmRect>()
    this._userArea = new csmVector<csmRect>()
    
    this.getParameterId()
    
    this.state = LoadStep.LoadAssets
    this.expressionCount = 0
    this.textureCount = 0
    this.motionCount = 0
    this.allMotionCount = 0
    this.wavFileHandler = new LAppWavFileHandler()
    
    this._rightArmMotionManager = new CubismMotionManager() // <<<追加！
    this._leftArmMotionManager = new CubismMotionManager()  // <<<追加！
  }
  
  public getParameterId() {
    const idManager: CubismIdManager = CubismFramework.getIdManager()
    this.idParamAngleX = idManager.getId(CubismDefaultParameterId.ParamAngleX)
    this.idParamAngleY = idManager.getId(CubismDefaultParameterId.ParamAngleY)
    this.idParamAngleZ = idManager.getId(CubismDefaultParameterId.ParamAngleZ)
    this.idParamEyeBallX = idManager.getId(CubismDefaultParameterId.ParamEyeBallX)
    this.idParamEyeBallY = idManager.getId(CubismDefaultParameterId.ParamEyeBallY)
    this.idParamBodyAngleX = idManager.getId(CubismDefaultParameterId.ParamBodyAngleX)
  }
  
  /**
   * 其中model3.json从目录和文件路径生成模型
   * @param dir
   * @param fileName
   */
  public loadAssets(dir: string, fileName: string): void {
    this.modelHomeDir = dir
    
    fetch(path.join(dir, fileName), { cache: 'no-cache' })
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const setting: ICubismModelSetting = new CubismModelSettingJson(arrayBuffer, arrayBuffer.byteLength)
        
        // 更新状态
        this.state = LoadStep.LoadModel
        
        // 保存结果
        this.setupModel(setting)
      })
  }
  
  /**
   * 以从model3.json中生成模型。
   * 如model3.json中所述，生成模型生成、运动和物理场等组件。
   *
   * @param setting ICubismModelSetting的实例
   */
  private setupModel(setting: ICubismModelSetting): void {
    this._updating = true
    this._initialized = false
    
    this.modelSetting = setting
    
    // CubismModel
    if (this.modelSetting.getModelFileName() != '') {
      const modelFileName = this.modelSetting.getModelFileName()
      
      fetch(path.join(this.modelHomeDir, modelFileName))
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          this.loadModel(arrayBuffer)
          this.state = LoadStep.LoadExpression
          
          // callback
          loadCubismExpression()
        })
      
      this.state = LoadStep.WaitLoadModel
    } else {
      LAppPal.printMessage('Model data does not exist.')
    }
    
    // Expression
    const loadCubismExpression = (): void => {
      if (this.modelSetting.getExpressionCount() > 0) {
        const count: number = this.modelSetting.getExpressionCount()
        
        for (let i = 0; i < count; i++) {
          const expressionName = this.modelSetting.getExpressionName(i)
          const expressionFileName =
            this.modelSetting.getExpressionFileName(i)
          
          fetch(path.join(this.modelHomeDir, expressionFileName))
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
              const motion: ACubismMotion = this.loadExpression(
                arrayBuffer,
                arrayBuffer.byteLength,
                expressionName,
              )
              
              if (this.expressions.getValue(expressionName) != null) {
                ACubismMotion.delete(
                  this.expressions.getValue(expressionName),
                )
                this.expressions.setValue(expressionName, null)
              }
              
              this.expressions.setValue(expressionName, motion)
              
              this.expressionCount++
              
              if (this.expressionCount >= count) {
                this.state = LoadStep.LoadPhysics
                
                // callback
                loadCubismPhysics()
              }
            })
        }
        this.state = LoadStep.WaitLoadExpression
      } else {
        this.state = LoadStep.LoadPhysics
        
        // callback
        loadCubismPhysics()
      }
    }
    
    // Physics
    const loadCubismPhysics = (): void => {
      if (this.modelSetting.getPhysicsFileName() != '') {
        const physicsFileName = this.modelSetting.getPhysicsFileName()
        
        fetch(path.join(this.modelHomeDir, physicsFileName))
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadPhysics(arrayBuffer, arrayBuffer.byteLength)
            
            this.state = LoadStep.LoadPose
            
            // callback
            loadCubismPose()
          })
        this.state = LoadStep.WaitLoadPhysics
      } else {
        this.state = LoadStep.LoadPose
        
        // callback
        loadCubismPose()
      }
    }
    
    // Pose
    const loadCubismPose = (): void => {
      if (this.modelSetting.getPoseFileName() != '') {
        const poseFileName = this.modelSetting.getPoseFileName()
        
        fetch(path.join(this.modelHomeDir, poseFileName))
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadPose(arrayBuffer, arrayBuffer.byteLength)
            
            this.state = LoadStep.SetupEyeBlink
            
            // callback
            setupEyeBlink()
          })
        this.state = LoadStep.WaitLoadPose
      } else {
        this.state = LoadStep.SetupEyeBlink
        
        // callback
        setupEyeBlink()
      }
    }
    
    // EyeBlink
    const setupEyeBlink = (): void => {
      if (this.modelSetting.getEyeBlinkParameterCount() > 0) {
        this._eyeBlink = CubismEyeBlink.create(this.modelSetting)
        this.state = LoadStep.SetupBreath
      }
      
      // callback
      setupBreath()
    }
    
    // Breath
    const setupBreath = (): void => {
      this._breath = CubismBreath.create()
      
      const breathParameters: csmVector<BreathParameterData> = new csmVector()
      breathParameters.pushBack(
        new BreathParameterData(this.idParamAngleX, 0.0, 15.0, 6.5345, 0.5),
      )
      breathParameters.pushBack(
        new BreathParameterData(this.idParamAngleY, 0.0, 8.0, 3.5345, 0.5),
      )
      breathParameters.pushBack(
        new BreathParameterData(this.idParamAngleZ, 0.0, 10.0, 5.5345, 0.5),
      )
      breathParameters.pushBack(
        new BreathParameterData(this.idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5),
      )
      breathParameters.pushBack(
        new BreathParameterData(
          CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamBreath,
          ),
          0.5,
          0.5,
          3.2345,
          1,
        ),
      )
      
      this._breath.setParameters(breathParameters)
      this.state = LoadStep.LoadUserData
      
      // callback
      loadUserData()
    }
    
    // UserData
    const loadUserData = (): void => {
      if (this.modelSetting.getUserDataFile() !== '') {
        const userDataFile = this.modelSetting.getUserDataFile()
        
        fetch(path.join(this.modelHomeDir, userDataFile))
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadUserData(arrayBuffer, arrayBuffer.byteLength)
            
            this.state = LoadStep.SetupEyeBlinkIds
            
            // callback
            setupEyeBlinkIds()
          })
        
        this.state = LoadStep.WaitLoadUserData
      } else {
        this.state = LoadStep.SetupEyeBlinkIds
        
        // callback
        setupEyeBlinkIds()
      }
    }
    
    // EyeBlinkIds
    const setupEyeBlinkIds = (): void => {
      const eyeBlinkIdCount: number =
        this.modelSetting.getEyeBlinkParameterCount()
      
      for (let i = 0; i < eyeBlinkIdCount; ++i) {
        this.eyeBlinkIds.pushBack(
          this.modelSetting.getEyeBlinkParameterId(i),
        )
      }
      
      this.state = LoadStep.SetupLipSyncIds
      
      // callback
      setupLipSyncIds()
    }
    
    // LipSyncIds
    const setupLipSyncIds = (): void => {
      const lipSyncIdCount = this.modelSetting.getLipSyncParameterCount()
      
      for (let i = 0; i < lipSyncIdCount; ++i) {
        this.lipSyncIds.pushBack(this.modelSetting.getLipSyncParameterId(i))
      }
      this.state = LoadStep.SetupLayout
      
      // callback
      setupLayout()
    }
    
    // Layout
    const setupLayout = (): void => {
      const layout: csmMap<string, number> = new csmMap<string, number>()
      
      if (this.modelSetting === null || this._modelMatrix === null) {
        CubismLogError('Failed to setupLayout().')
        return
      }
      
      this.modelSetting.getLayoutMap(layout)
      this._modelMatrix.setupFromLayout(layout)
      this.state = LoadStep.LoadMotion
      
      // callback
      loadCubismMotion()
    }
    
    // Motion
    const loadCubismMotion = (): void => {
      this.state = LoadStep.WaitLoadMotion
      this.model.saveParameters()
      this.allMotionCount = 0
      this.motionCount = 0
      const group: string[] = []
      
      const motionGroupCount: number = this.modelSetting.getMotionGroupCount()
      
      // 查找动议总数
      for (let i = 0; i < motionGroupCount; i++) {
        group[i] = this.modelSetting.getMotionGroupName(i)
        this.allMotionCount += this.modelSetting.getMotionCount(group[i])
      }
      
      // 导入运动
      for (let i = 0; i < motionGroupCount; i++) {
        this.preLoadMotionGroup(group[i])
      }
      
      // 没有运动时
      if (motionGroupCount == 0) {
        this.reloadTextures()
      }
    }
  }
  
  /**
   * 将纹理加载到纹理单元中
   */
  private setupTextures(): void {
    // iPhone手机使用预乘的 Alpha 来提高 Alpha 质量
    const usePremultiply = true
    
    if (this.state === LoadStep.LoadTexture) {
      // 用于纹理加载
      const textureCount: number = this.modelSetting.getTextureCount()
      
      for (let index = 0; index < textureCount; index++) {
        // 如果纹理名称为空，请跳过加载绑定过程
        if (this.modelSetting.getTextureFileName(index) === '') {
          LAppPal.printMessage('getTextureFileName null')
          continue
        }
        
        // 将纹理加载到 WebGL 中的纹理单元中
        const textureName = this.modelSetting.getTextureFileName(index)
        const texturePath = path.join(this.modelHomeDir, textureName)
        
        // 加载完成时调用的回调函数
        const onLoad = (textureInfo: TextureInfo): void => {
          this.getRenderer()?.bindTexture(index, textureInfo.id)
          
          this.textureCount++
          
          if (this.textureCount >= textureCount) {
            // 加载完成
            this.state = LoadStep.CompleteSetup
          }
        }
        
        // 负荷
        LAppDelegate.instance.textureManager.createTextureFromPngFile(texturePath, usePremultiply, onLoad)
        this.getRenderer()?.setIsPremultipliedAlpha(usePremultiply)
      }
      
      this.state = LoadStep.WaitLoadTexture
    }
  }
  
  /**
   * 重新生成渲染器
   */
  public reloadRenderer(): void {
    this.deleteRenderer()
    this.createRenderer()
    this.setupTextures()
  }
  
  /**
   * 更新
   */
  public update(): void {
    if (this.state != LoadStep.CompleteSetup) return
    
    const deltaTimeSeconds: number = LAppPal.getDeltaTime()
    this.userTimeSeconds += deltaTimeSeconds
    
    this._dragManager.update(deltaTimeSeconds)
    this._dragX = this._dragManager.getX()
    this._dragY = this._dragManager.getY()
    
    // 参数是否通过运动更新
    let motionUpdated = false
    
    //--------------------------------------------------------------------------
    this.model.loadParameters() // 加载上次保存的状态
    if (this._motionManager.isFinished()) {
      // 如果没有动作播放，它将从等待的动作中随机播放。
      this.startRandomMotion(MotionGroup.Idle, Priority.Idle)
    } else {
      const normal = this._motionManager.updateMotion(this.model, deltaTimeSeconds) // 更新运动
      const rightArm = this._rightArmMotionManager.updateMotion(this.model, deltaTimeSeconds)   // <追加
      const leftArm = this._leftArmMotionManager.updateMotion(this.model, deltaTimeSeconds)    // <追加
      
      motionUpdated = [ normal, rightArm, leftArm ].some(k => k)
    }
    this.model.saveParameters() // 保存状态
    //--------------------------------------------------------------------------
    
    // 眨眼
    if (!motionUpdated) {
      // 当没有主运动更新时
      this._eyeBlink?.updateParameters(this.model, deltaTimeSeconds) // 眨眼
    }
    
    this._expressionManager?.updateMotion(this.model, deltaTimeSeconds) // 使用面部表情更新参数（相对变化）
    
    // 拖动引起的更改
    // 通过拖动调整面部方向
    this.model.addParameterValueById(this.idParamAngleX, this._dragX * 30) // 将 -30 之间的值添加到 30
    this.model.addParameterValueById(this.idParamAngleY, this._dragY * 30)
    this.model.addParameterValueById(this.idParamAngleZ, this._dragX * this._dragY * -30)
    
    // 通过拖动调整身体方向
    this.model.addParameterValueById(this.idParamBodyAngleX, this._dragX * 10) // 将 -10 之间的值添加到 10
    
    // 通过拖动调整眼睛方向
    this.model.addParameterValueById(this.idParamEyeBallX, this._dragX) // 将值 -1 添加到 1
    this.model.addParameterValueById(this.idParamEyeBallY, this._dragY)
    
    // 呼吸等。
    this._breath?.updateParameters(this.model, deltaTimeSeconds)
    
    // 设置物理场
    this._physics?.evaluate(this.model, deltaTimeSeconds)
    
    // 口型同步设置
    if (this._lipsync) {
      this.wavFileHandler?.update(deltaTimeSeconds)
      // 对于实时口型同步，请从系统获取音量并输入 0~1 范围内的值。
      const value = this.wavFileHandler.getRms()
      
      for (let i = 0; i < this.lipSyncIds.getSize(); ++i) {
        this.model.addParameterValueById(this.lipSyncIds.at(i), value, 0.8)
      }
    }
    
    // 姿势设置
    this._pose?.updateParameters(this.model, deltaTimeSeconds)
    
    this.model.update()
  }
  
  /**
   * 开始播放参数指定的运动
   * @param group 运动组名称
   * @param no 组中的数字
   * @param priority 优先权
   * @param onFinishedMotionHandler 在动作播放结束时调用的回调函数
   * @return 返回已开始的运动的标识号。 在参数 is Done（） 中使用，以确定单个运动是否已结束。 如果无法启动[-1]
   */
  public startMotion(
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (priority == Priority.Force) {
      this._motionManager.setReservePriority(priority)
    } else if (!this._motionManager.reserveMotion(priority)) {
      if (this._debugMode) {
        LAppPal.printMessage('[APP]can\'t start motion.')
      }
      return InvalidMotionQueueEntryHandleValue
    }
    
    const { motion, autoDelete } = this.getMotion(group, no, onFinishedMotionHandler)
    
    //voice
    const voice = this.modelSetting.getMotionSoundFileName(group, no)
    if (voice.localeCompare('') != 0) {
      let path = this.modelHomeDir + voice
      this.wavFileHandler.start(path).catch()
    }
    
    if (this._debugMode) {
      LAppPal.printMessage(`[APP]start motion: [${ group }_${ no }`)
    }
    return this._motionManager.startMotionPriority(motion, autoDelete, priority)
  }
  
  /**
   * 开始播放随机选择的动作。
   * @param group 运动组名称
   * @param priority 优先权
   * @param onFinishedMotionHandler 在动作播放结束时调用的回调函数
   * @return 返回已开始的运动的标识号。 在参数 is Done（） 中使用，以确定单个运动是否已结束。 如果无法启动[-1]
   */
  public startRandomMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (this.modelSetting.getMotionCount(group) == 0) {
      return InvalidMotionQueueEntryHandleValue
    }
    
    const no: number = Math.floor(Math.random() * this.modelSetting.getMotionCount(group))
    
    return this.startMotion(group, no, priority, onFinishedMotionHandler)
  }
  
  public getMotion(group: string, no: number, onFinishedMotionHandler?: FinishedMotionCallback) {
    const motionFileName = this.modelSetting.getMotionFileName(group, no)
    
    // ex) idle_0
    const name = `${ group }_${ no }`
    let motion: CubismMotion = this.motions.getValue(name) as CubismMotion
    let autoDelete = false
    
    const srcPath = path.join(this.modelHomeDir, motionFileName)
    if (motion == null) {
      fetch(srcPath)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          motion = this.loadMotion(arrayBuffer, arrayBuffer.byteLength, null, onFinishedMotionHandler)
          
          let fadeTime: number = this.modelSetting.getMotionFadeInTimeValue(group, no)
          if (fadeTime >= 0.0) {
            motion.setFadeInTime(fadeTime)
          }
          
          fadeTime = this.modelSetting.getMotionFadeOutTimeValue(group, no)
          if (fadeTime >= 0.0) {
            motion.setFadeOutTime(fadeTime)
          }
          
          motion.setEffectIds(this.eyeBlinkIds, this.lipSyncIds)
          autoDelete = true // 退出时从内存中删除
        })
    } else {
      motion.setFinishedMotionHandler(onFinishedMotionHandler)
    }
    
    return { motion, autoDelete }
  }
  
  // 通过从StartMotion复制创建
  public startHandMotion(
    targetManage: CubismMotionManager,
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (priority == Priority.Force) {
      targetManage.setReservePriority(priority)
    } else if (!targetManage.reserveMotion(priority)) {
      if (this._debugMode) {
        LAppPal.printMessage('[APP]can\'t start motion.')
      }
      return InvalidMotionQueueEntryHandleValue
    }
    
    const { motion, autoDelete } = this.getMotion(group, no, onFinishedMotionHandler)
    
    //voice
    const voice = this.modelSetting.getMotionSoundFileName(group, no)
    if (voice.localeCompare('') != 0) {
      let path = this.modelHomeDir + voice
      this.wavFileHandler.start(path).catch()
    }
    
    if (this._debugMode) {
      LAppPal.printMessage(`[APP]start motion: ${ name }`)
    }
    return targetManage.startMotionPriority(motion, autoDelete, priority)
  }
  
  // 通过startRandomMotion复制创建
  public startRandomRightHandMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (this.modelSetting.getMotionCount(group) == 0) {
      return InvalidMotionQueueEntryHandleValue
    }
    let no: number = Math.floor(Math.random() * this.modelSetting.getMotionCount(group))
    
    return this.startHandMotion(this._rightArmMotionManager, group, no, priority, onFinishedMotionHandler)
  }
  
  // 通过startRandomMotion复制创建
  public startRandomLeftHandMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
  ): CubismMotionQueueEntryHandle {
    if (this.modelSetting.getMotionCount(group) == 0) {
      return InvalidMotionQueueEntryHandleValue
    }
    let no: number = Math.floor(Math.random() * this.modelSetting.getMotionCount(group))
    return this.startHandMotion(this._leftArmMotionManager, group, no, priority, onFinishedMotionHandler)
  }
  
  /**
   * 设置参数指定的面部表情动作
   *
   * @param expressionId 面部表情运动 ID
   */
  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this.expressions.getValue(expressionId)
    
    if (this._debugMode) {
      LAppPal.printMessage(`[APP]expression: [${ expressionId }]`)
    }
    
    if (motion != null) {
      this._expressionManager.startMotionPriority(motion, false, Priority.Force)
    } else {
      if (this._debugMode) {
        LAppPal.printMessage(`[APP]expression[${ expressionId }] is null`)
      }
    }
  }
  
  /**
   * 设置随机选择的面部表情动作
   * expressions/[random_expression_name].exp3.json
   */
  public setRandomExpression(): void {
    if (this.expressions.getSize() == 0) {
      return
    }
    
    const no: number = Math.floor(Math.random() * this.expressions.getSize())
    
    for (let i = 0; i < this.expressions.getSize(); i++) {
      if (i == no) {
        const name: string = this.expressions._keyValues[i].first
        this.setExpression(name)
        return
      }
    }
  }
  
  /**
   * 接收事件的触发
   */
  public motionEventFired(eventValue: csmString): void {
    CubismLogInfo('{0} is fired on LAppModel!!', eventValue.s)
  }
  
  /**
   * 是否命中透明物
   * @returns {boolean}
   */
  public hitOpacity() {
    return this._opacity < 1
  }
  
  /**
   * 命中测试
   * 根据指定ID的顶点列表计算一个矩形，并确定坐标在矩形范围内。
   *
   * @param hitArenaName  要测试命中确定的目标的 ID
   * @param x             X 坐标做出判断
   * @param y             Y坐标做出判断
   */
  public hitTest(hitArenaName: string, x: number, y: number): boolean {
    // 当透明时，没有命中判断。
    if (this.hitOpacity()) {
      return false
    }
    
    const count: number = this.modelSetting.getHitAreasCount()
    
    for (let i = 0; i < count; i++) {
      if (this.modelSetting.getHitAreaName(i) == hitArenaName) {
        const drawId: CubismIdHandle = this.modelSetting.getHitAreaId(i)
        return this.isHit(drawId, x, y)
      }
    }
    
    return false
  }
  
  /**
   * 从组名批量加载运动数据。
   * 运动数据的名称是从“模型设置”内部获取的。
   *
   * @param group 运动数据的组名称
   */
  public preLoadMotionGroup(group: string): void {
    for (let i = 0; i < this.modelSetting.getMotionCount(group); i++) {
      const motionFileName = this.modelSetting.getMotionFileName(group, i)
      
      // ex) idle_0
      const name = `${ group }_${ i }`
      if (this._debugMode) {
        LAppPal.printMessage(`[APP]load motion: ${ motionFileName } => [${ name }]`)
      }
      
      fetch(path.join(this.modelHomeDir, motionFileName))
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          const tmpMotion: CubismMotion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            name,
          )
          
          let fadeTime = this.modelSetting.getMotionFadeInTimeValue(group, i)
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeInTime(fadeTime)
          }
          
          fadeTime = this.modelSetting.getMotionFadeOutTimeValue(group, i)
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeOutTime(fadeTime)
          }
          tmpMotion.setEffectIds(this.eyeBlinkIds, this.lipSyncIds)
          
          if (this.motions.getValue(name) != null) {
            ACubismMotion.delete(this.motions.getValue(name))
          }
          
          this.motions.setValue(name, tmpMotion)
          
          this.motionCount++
          if (this.motionCount >= this.allMotionCount) {
            this.reloadTextures()
          }
        })
    }
  }
  
  private reloadTextures(): void {
    this.state = LoadStep.LoadTexture
    
    // 停止所有运动
    this._motionManager?.stopAllMotions()
    
    this._updating = false
    this._initialized = true
    
    this.createRenderer()
    
    this.setupTextures()
    this.getRenderer().startUp(LAppDelegate.gl)
  }
  
  /**
   * 释放所有运动数据。
   */
  public releaseMotions(): void {
    this.motions.clear()
  }
  
  /**
   * 释放所有面部表情数据。
   */
  public releaseExpressions(): void {
    this.expressions.clear()
  }
  
  /**
   * 绘制模型的过程。 传递要在其中绘制模型的空间的视图投影矩阵。
   */
  public doDraw(): void {
    if (this.model == null) return
    
    // 传递画布大小
    const viewport: number[] = [
      0,
      0,
      LAppDelegate.canvas.width,
      LAppDelegate.canvas.height,
    ]
    
    this.getRenderer().setRenderState(LAppDelegate.frameBuffer, viewport)
    this.getRenderer().drawModel()
  }
  
  /**
   * 绘制模型的过程。 传递要在其中绘制模型的空间的视图投影矩阵。
   */
  public draw(matrix: CubismMatrix44): void {
    if (this.model === null) {
      return
    }
    
    // 每次导入后
    if (this.state == LoadStep.CompleteSetup) {
      matrix.multiplyByMatrix(this._modelMatrix)
      
      this.getRenderer().setMvpMatrix(matrix)
      
      this.doDraw()
    }
  }
  
  public override release(): void {
    this._leftArmMotionManager.release()
    this._rightArmMotionManager.release()
    this.wavFileHandler.release()
    
    super.release()
  }
}
