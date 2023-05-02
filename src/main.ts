import LAppDefine, { HitArea, setDefaults, LAppDefineOptions } from './lappdefine'
import { LAppDelegate } from './lappdelegate'
import { LAppLive2DManager } from './lapplive2dmanager'

export type { LAppDefineOptions } from './lappdefine'
export { HitArea } from './lappdefine'

export class Live2dWidget {
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
    setDefaults(options)
    
    const init = this.model.initialize()
    if (!init) return
    
    this.model.run()
    
    this.listener()
  }
  
  static async release() {
    return this.model.release()
  }
  
  private static listener() {
    window.addEventListener('beforeunload', () => LAppDelegate.releaseInstance())
    window.addEventListener('resize', () => (LAppDefine.canvas === 'auto') && this.model.onResize())
  }
  
  static on(type: HitArea, callback: () => void) {
    this.eventListener[type]?.push(callback)
  }
  
  static emit(type: string) {
    this.eventListener[type]?.forEach(callback => callback())
  }
}

export default Live2dWidget
