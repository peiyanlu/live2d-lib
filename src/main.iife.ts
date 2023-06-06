import LAppDefine, { HitArea, setDefaults, LAppDefineOptions } from './lappdefine'
import { LAppDelegate } from './lappdelegate'
import { LAppLive2DManager } from './lapplive2dmanager'

export default class Live2dWidget {
  static initialized: boolean = false
  
  private static eventListener = {
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
  
  static async release() {
    if (this.initialized) {
      this.initialized = false
      LAppDelegate.releaseInstance()
    }
    return !this.initialized
  }
  
  private static listener() {
    window.addEventListener('beforeunload', () => this.model.release())
    window.addEventListener('resize', () => (LAppDefine.canvas === 'auto') && this.model.onResize())
  }
  
  static on(type: HitArea, callback: () => void) {
    this.eventListener[type]?.push(callback)
  }
  
  static emit(type: string) {
    this.eventListener[type]?.forEach(callback => callback())
  }
}
