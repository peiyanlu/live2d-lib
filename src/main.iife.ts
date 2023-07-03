import { LAppDefineOptions, setDefaults } from './lappdefine'
import { Live2dWidgetBase } from './main'

export default class Live2dWidgetIife extends Live2dWidgetBase {
  static async init(options: LAppDefineOptions) {
    setDefaults(options)
    
    const init = this.model.initialize()
    if (!init) return
    
    this.model.run()
    
    this.listener()
  }
}
