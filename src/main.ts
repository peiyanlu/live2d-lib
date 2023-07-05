import LAppDefine, { doc, HitArea, LAppDefineOptions, setDefaults } from './lappdefine'
import { LAppDelegate } from './lappdelegate'
import { LAppLive2DManager } from './lapplive2dmanager'
import { LAppView } from './lappview'

export type { LAppDefineOptions } from './lappdefine'
export { HitArea } from './lappdefine'

export class Live2dWidgetBase {
  static initialized: boolean = false
  
  protected static eventListener = {
    [HitArea.Head]: [],
    [HitArea.Body]: [],
    [HitArea.Left]: [],
    [HitArea.Right]: [],
    [HitArea.Other]: [],
  }
  
  static get model(): LAppDelegate {
    return LAppDelegate.instance
  }
  
  static get scene(): LAppLive2DManager {
    return LAppLive2DManager.instance
  }
  
  static get view(): LAppView {
    return this.model.view
  }
  
  static async init(options: LAppDefineOptions): Promise<boolean> {
    try {
      setDefaults(options)
      
      const init = this.model.initialize()
      if (!init) return
      
      this.model.run()
      
      this.listener()
      
      this.initialized = true
    } catch ( e ) {
      this.initialized = false
    }
    
    return this.initialized
  }
  
  static async release(): Promise<boolean> {
    if (this.initialized) {
      this.initialized = false
      LAppDelegate.releaseInstance()
    }
    return !this.initialized
  }
  
  protected static listener() {
    window.addEventListener('beforeunload', () => this.model.release())
    window.addEventListener('resize', () => (LAppDefine.canvas === 'auto') && this.model.onResize())
  }
  
  static on(type: HitArea, callback: () => void): void {
    this.eventListener[type]?.push(callback)
  }
  
  static emit(type: string): void {
    this.eventListener[type]?.forEach((callback: () => void) => callback())
  }
}


export class Live2dWidget extends Live2dWidgetBase {
  static async loadScript():Promise<typeof globalThis.Live2DCubismCore> {
    return new Promise((resolve) => {
      if (globalThis.Live2DCubismCore) resolve(globalThis.Live2DCubismCore)
      
      const script = doc.createElement('script')
      script.src = LAppDefine.cubismCorePath
      doc.body.appendChild(script)
      script.onload = () => resolve(globalThis.Live2DCubismCore)
    })
  }
  
  static override async init(options: LAppDefineOptions): Promise<boolean> {
    await this.loadScript()
    
    return await Live2dWidgetBase.init(options)
  }
}

export default Live2dWidget
