import LAppDefine, { doc, HitArea, LAppDefineOptions, setDefaults } from './lappdefine'
import { LAppDelegate } from './lappdelegate'
import { LAppLive2DManager } from './lapplive2dmanager'

export type { LAppDefineOptions } from './lappdefine'
export { HitArea } from './lappdefine'

export class Live2dWidgetBase {
  protected static eventListener = {
    [HitArea.Head]: [],
    [HitArea.Body]: [],
    [HitArea.Left]: [],
    [HitArea.Right]: [],
    [HitArea.Other]: [],
  }
  
  static get model() {
    return LAppDelegate.instance
  }
  
  static get scene() {
    return LAppLive2DManager.instance
  }
  
  static get view() {
    return this.model.view
  }
  
  static async init(options: LAppDefineOptions) {
    setDefaults(options)
    
    const init = this.model.initialize()
    if (!init) return
    
    this.model.run()
    
    this.listener()
  }
  
  static async release() {
    return this.model.release()
  }
  
  protected static listener() {
    window.addEventListener('beforeunload', () => this.model.release())
    window.addEventListener('resize', () => (LAppDefine.canvas === 'auto') && this.model.onResize())
  }
  
  static on(type: HitArea, callback: () => void) {
    this.eventListener[type]?.push(callback)
  }
  
  static emit(type: string) {
    this.eventListener[type]?.forEach((callback: () => void) => callback())
  }
}


export class Live2dWidget extends Live2dWidgetBase {
  static async loadScript() {
    return new Promise((resolve) => {
      if (globalThis.Live2DCubismCore) resolve(globalThis.Live2DCubismCore)
      
      const script = doc.createElement('script')
      script.src = LAppDefine.cubismCorePath
      doc.body.appendChild(script)
      script.onload = () => resolve(globalThis.Live2DCubismCore)
    })
  }
  
  static override async init(options: LAppDefineOptions) {
    await this.loadScript()
    
    await Live2dWidgetBase.init(options)
  }
}

export default Live2dWidget
