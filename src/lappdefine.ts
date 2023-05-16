/**
 * 示例应用中使用的常量
 */

interface CanvasOptions {
  width: number;
  height: number;
}

interface SourceOptions {
  path: string;
  models: string[];
}

export interface LAppDefineOptions {
  canvas?: CanvasOptions | 'auto';
  scale?: number;
  debug?: boolean;
  target?: HTMLElement;
  cubismCorePath?: string;
  source: SourceOptions;
}

// 画面
export enum ViewScale {
  Max = 2.0,
  Min = 0.8
}

export enum ViewLogical {
  Left = -1.0,
  Right = 1.0,
  Bottom = -1.0,
  Top = 1.0
}

export enum ViewLogicalMax {
  Left = -2.0,
  Right = 2.0,
  Bottom = -2.0,
  Top = 2.0
}

// 与外部定义文件 （JSON） 对齐
export enum MotionGroup {
  Idle = 'Idle', // 空闲
  TapBody = 'TapBody', // 当轻拍身体时
  TapLeft = 'TapLeft', // 当轻拍身体左侧时（左胳膊）
  TapRight = 'TapRight', // 当轻拍身体右侧时（右胳膊）
  Tap = 'Tap' // 当点击重叠检测区域之外时
}

// 与外部定义文件 （JSON） 对齐
export enum HitArea {
  Head = 'Head',
  Body = 'Body',
  Left = 'Left',
  Right = 'Right',
  Other = 'Other'
}

// 运动优先级常数
export enum Priority {
  None = 0,
  Idle,
  Normal,
  Force
}

export const doc = globalThis.document || {} as Document

const LAppDefine: LAppDefineOptions = {
  canvas: {
    width: 280,
    height: 360,
  },
  scale: 1.0,
  debug: false,
  target: doc.body,
  source: {
    path: '',
    models: [],
  },
  cubismCorePath: '/live2d/core/live2dCubismCore.min.js',
}

export const setDefaults = (options: LAppDefineOptions) => {
  LAppDefine.target = doc.body
  Object.keys(options).forEach(key => {
    if (LAppDefine.hasOwnProperty(key)) {
      LAppDefine[key] = options[key]
    }
  })
}

export default LAppDefine
