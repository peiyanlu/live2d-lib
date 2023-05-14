# live2d-lib

`live2d-lib` 是一个基于 `Cubism 4.x SDK` 的看板娘加载 `API`。

## ✨特点

* 支持 `CDN` 和 `ESModule`
* 支持自定义渲染位置
* 使用新版本 `Cubism 4.x`
* 支持 `TypeScript`

## 🌈安装

```shell
npm install live2d-lib -D

# yarn
yarn add live2d-lib -D

# pnpm
pnpm add live2d-lib -D
```

## 🛠️使用

* `CDN`

```html

<script src="https://unpkg.com/live2d-lib"></script>
<script>
  window.onload = () => {
    Live2dWidget.init({
      canvas: {
        width: 460,
        height: 600,
      },
      source: {
        path: '/live2d/models',
        models: [ 'hijiki', 'tororo' ]
      },
    })
  }
</script>
```

* `ESModule`

```js
import Live2dWidget from 'live2d-lib'

Live2dWidget.init({
  canvas: {
    width: 460,
    height: 600,
  },
  scale: 1,
  debug: false,
  target: document.querySelector('#sample'),
  source: {
    path: '/live2d/models',
    models: [ 'hijiki', 'tororo' ]
  },
})
```

* 说明

`live2dcubismcore.min.js` 不支持 `ESMdule`，为避免二次编译时 `__dirname` 等 `node` 模块报错，
`ESModule` 格式文件中对其采用静态资源引入的方式，`live2d-lib` 安装完成后会自动将资源拷贝至项目根目录的 `public` 目录中（eg：）；
`iife` 格式文件中依旧使用捆绑模式。


## 🔑 API

1. 场景加载

```ts
Live2dWidget.init({} as LAppDefineOptions)
```

| 参数名    | 参数说明                        | 可选    | 默认值                      |
|--------|-----------------------------|-------|--------------------------|
| canvas | canvas 元素的宽高，为 auto 时使用窗口大小 | true  | {width: 280,height: 360} |
| scale  | 视觉效果缩放比                     | true  | 1.0                      |
| debug  | 是否打印交互信息                    | true  | false                    |
| target | 模型要渲染的的位置                   | true  | document.body            |
| source | 模型资源的路径                     | false | {path:'',models:[]}      |

`source` 不提供默认参数值，参数内容为：

* `path` - 存放资源的目录，`npm` 包的 `resources` 文件夹中提供了一些官方模型。

* `models` - 资源的目录名称，目录名称必须与文件名称前缀相同。

```ts
const options: LAppDefineOptions = {
  source: {
    path: '../resources',
    models: [ 'hijiki', 'tororo' ]
  }
}
```
模型的加载路径会通过 `path.join()` 处理，上方示例中模型路径会拼接为 `../resources/hijiki/hijiki.model3.json`。

2. 场景切换

```ts
// 上一场景
Live2dWidget.scene.prevScene()

// 下一场景
Live2dWidget.scene.nextScene()
```

3. 事件监听

支持对头部、身体、左右区域（例如：左右胳膊）点击事件监听。（需要模型支持重叠检测）

```ts
Live2dWidget.on(type as HitArea, callback as ()=>void)
```

4. 参数类型定义

- LAppDefineOptions

```ts
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
  source: SourceOptions;
}
```

- HitArea

```ts
export enum HitArea {
  Head = 'Head',
  Body = 'Body',
  Left = 'Left',
  Right = 'Right',
  Other = 'Other'
}
```

- MotionGroup

```ts
export enum MotionGroup {
  Idle = 'Idle', // 空闲
  TapBody = 'TapBody', // 当轻拍身体时
  TapLeft = 'TapLeft', // 当轻拍身体左侧时（左胳膊）
  TapRight = 'TapRight', // 当轻拍身体右侧时（右胳膊）
  Tap = 'Tap' // 当点击重叠检测区域之外时
}
```

## 🎯 重叠检测

请阅读官网文档：[重叠检测的设置准备](https://docs.live2d.com/zh-CHS/cubism-editor-manual/hittest/)

为重叠检测用网格的 `ID` 命名时需要使用 `HitArea` 提供的除了 `HitArea.Other` 之外名字方能生效，`HitArea.Other` 用于处理非重叠检测区域的点击操作；

点击 `Head` 区域将执行脸部表情，对应的内容不在 `Motions` 中配置而是在 `Expressions`；如果需要在点击重叠检测区域之外时播放动作，请在 `Motions` 中配置 `Tap` 字段；

`HitAreas` 与 `Motions` 的对应关系如下：

- HitArea.Body -> MotionGroup.TapBody

- HitArea.Left -> MotionGroup.TapLeft

- HitArea.Right -> MotionGroup.TapRight

- 非检测区域 -> MotionGroup.Tap

`xxx.model3.json` 配置示例如下：

```json
{
  "FileReferences": {
    "Expressions": [
      {
        "Name": "Angry.exp3.json",
        "File": "expressions/Angry.exp3.json"
      }
    ],
    "Motions": {
      "Idle": [
        {
          "File": "motion/00_idle.motion3.json"
        }
      ],
      "TapBody": [
        {
          "File": "motion/02.motion3.json"
        }
      ],
      "TapLeft": [
        {
          "File": "motion/06.motion3.json"
        }
      ],
      "TapRight": [
        {
          "File": "motion/01.motion3.json"
        }
      ],
      "Tap": [
        {
          "File": "motion/01.motion3.json"
        }
      ]
    }
  },
  "HitAreas": [
    {
      "Id": "HitAreaBody",
      "Name": "Body"
    },
    {
      "Id": "HitAreaLeft",
      "Name": "Left"
    },
    {
      "Id": "HitAreaRight",
      "Name": "Right"
    }
  ]
}
```
