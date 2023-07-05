import { csmVector } from '@framework/type/csmvector';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { ACubismMotion, FinishedMotionCallback } from '@framework/motion/acubismmotion';
import { ICubismModelSetting } from '@framework/icubismmodelsetting';
import { CubismIdHandle } from '@framework/id/cubismid';
import { CubismUserModel } from '@framework/model/cubismusermodel';
import { CubismMotion } from '@framework/motion/cubismmotion';
import { CubismMotionManager } from '@framework/motion/cubismmotionmanager';
import { CubismMotionQueueEntryHandle } from '@framework/motion/cubismmotionqueuemanager';
import { csmMap } from '@framework/type/csmmap';
import { csmRect } from '@framework/type/csmrectf';
import { csmString } from '@framework/type/csmstring';

declare class LAppView {
    private readonly touchManager;
    private readonly deviceToScreen;
    private readonly viewMatrix;
    private readonly sprites;
    private programId?;
    released: boolean;
    constructor();
    initialize(): void;
    release(): void;
    render(): void;
    addSprite(imgPath: string, position?: {
        x: number;
        y: number;
    }, size?: {
        width: number;
        height: number;
    }, hitCallback?: () => void): void;
    initializeSprite(): void;
    onTouchesBegan(pointX: number, pointY: number): void;
    onTouchesMoved(pointX: number, pointY: number): void;
    onTouchesEnded(pointX: number, pointY: number): void;
    transformViewX(deviceX: number): number;
    transformViewY(deviceY: number): number;
    transformScreenX(deviceX: number): number;
    transformScreenY(deviceY: number): number;
}

interface CanvasOptions {
    width: number;
    height: number;
}
interface SourceOptions {
    path: string;
    models: string[];
}
interface LAppDefineOptions {
    canvas?: CanvasOptions | 'auto';
    scale?: number;
    debug?: boolean;
    target?: HTMLElement;
    cubismCorePath?: string;
    source: SourceOptions;
}
declare enum HitArea {
    Head = "Head",
    Body = "Body",
    Left = "Left",
    Right = "Right",
    Other = "Other"
}

declare class LAppTextureManager {
    textures: csmVector<TextureInfo>;
    constructor();
    release(): void;
    createTextureFromPngFile(fileName: string, usePremultiply: boolean, callback: (textureInfo: TextureInfo) => void): void;
    releaseTextures(): void;
    releaseTextureByTexture(texture: WebGLTexture): void;
    releaseTextureByFilePath(fileName: string): void;
}
declare class TextureInfo {
    img: HTMLImageElement;
    id: WebGLTexture;
    width: number;
    height: number;
    usePremultply: boolean;
    fileName: string;
}

declare class LAppDelegate {
    private readonly cubismOption;
    readonly view: LAppView;
    captured: boolean;
    readonly textureManager: LAppTextureManager;
    private static _instance;
    static frameBuffer: WebGLFramebuffer;
    static canvas: HTMLCanvasElement;
    static gl: WebGLRenderingContext;
    private readonly canvasId;
    private loopId;
    static get instance(): LAppDelegate;
    constructor();
    static releaseInstance(): void;
    initialize(): boolean;
    getCanvas(): HTMLCanvasElement;
    private onEvent;
    onResize(): void;
    release(): void;
    run(): void;
    createShader(): WebGLProgram;
    initializeCubism(): void;
    private _resizeCanvas;
}

declare class LAppWavFileHandler {
    protected static _instance: LAppWavFileHandler;
    pcmData: Array<Float32Array>;
    userTimeSeconds: number;
    lastRms: number;
    sampleOffset: number;
    wavFileInfo: WavFileInfo;
    byteReader: ByteReader;
    audio: HTMLAudioElement;
    audioPlayPromise?: Promise<void>;
    constructor();
    private loadFileToBytes;
    static getInstance(): LAppWavFileHandler;
    static releaseInstance(): void;
    update(deltaTimeSeconds: number): boolean;
    start(filePath: string): Promise<boolean>;
    getRms(): number;
    loadWavFile(filePath: string): Promise<boolean>;
    playWavFile(filePath: string): void;
    getPcmSample(): number;
    releasePcmData(): void;
    release(): void;
}
declare class WavFileInfo {
    _fileName: string;
    _numberOfChannels: number;
    _bitsPerSample: number;
    _samplingRate: number;
    _samplesPerChannel: number;
    constructor();
}
declare class ByteReader {
    _fileByte: ArrayBuffer;
    _fileDataView: DataView;
    _fileSize: number;
    _readOffset: number;
    constructor();
    get8(): number;
    get16LittleEndian(): number;
    get24LittleEndian(): number;
    get32LittleEndian(): number;
    getCheckSignature(reference: string): boolean;
}

declare class LAppModel extends CubismUserModel {
    modelSetting: ICubismModelSetting;
    modelHomeDir: string;
    userTimeSeconds: number;
    eyeBlinkIds: csmVector<CubismIdHandle>;
    lipSyncIds: csmVector<CubismIdHandle>;
    motions: csmMap<string, ACubismMotion>;
    expressions: csmMap<string, ACubismMotion>;
    _hitArea: csmVector<csmRect>;
    _userArea: csmVector<csmRect>;
    idParamAngleX: CubismIdHandle;
    idParamAngleY: CubismIdHandle;
    idParamAngleZ: CubismIdHandle;
    idParamEyeBallX: CubismIdHandle;
    idParamEyeBallY: CubismIdHandle;
    idParamBodyAngleX: CubismIdHandle;
    state: number;
    expressionCount: number;
    textureCount: number;
    motionCount: number;
    allMotionCount: number;
    wavFileHandler: LAppWavFileHandler;
    private readonly _rightArmMotionManager;
    private readonly _leftArmMotionManager;
    private get model();
    constructor();
    getParameterId(): void;
    loadAssets(dir: string, fileName: string): void;
    private setupModel;
    private setupTextures;
    reloadRenderer(): void;
    update(): void;
    startMotion(group: string, no: number, priority: number, onFinishedMotionHandler?: FinishedMotionCallback): CubismMotionQueueEntryHandle;
    startRandomMotion(group: string, priority: number, onFinishedMotionHandler?: FinishedMotionCallback): CubismMotionQueueEntryHandle;
    getMotion(group: string, no: number, onFinishedMotionHandler?: FinishedMotionCallback): {
        motion: CubismMotion;
        autoDelete: boolean;
    };
    startHandMotion(targetManage: CubismMotionManager, group: string, no: number, priority: number, onFinishedMotionHandler?: FinishedMotionCallback): CubismMotionQueueEntryHandle;
    startRandomRightHandMotion(group: string, priority: number, onFinishedMotionHandler?: FinishedMotionCallback): CubismMotionQueueEntryHandle;
    startRandomLeftHandMotion(group: string, priority: number, onFinishedMotionHandler?: FinishedMotionCallback): CubismMotionQueueEntryHandle;
    setExpression(expressionId: string): void;
    setRandomExpression(): void;
    motionEventFired(eventValue: csmString): void;
    hitOpacity(): boolean;
    hitTest(hitArenaName: string, x: number, y: number): boolean;
    preLoadMotionGroup(group: string): void;
    private reloadTextures;
    releaseMotions(): void;
    releaseExpressions(): void;
    doDraw(): void;
    draw(matrix: CubismMatrix44): void;
    release(): void;
}

declare class LAppLive2DManager {
    private readonly viewMatrix;
    private readonly models;
    private sceneIndex;
    private static _instance;
    static get instance(): LAppLive2DManager;
    constructor();
    _finishedMotion: (self: ACubismMotion) => void;
    static initialize(): LAppLive2DManager;
    static releaseInstance(): void;
    getModel(no: number): LAppModel;
    releaseAllModel(): void;
    onDrag(x: number, y: number): void;
    onTap(x: number, y: number): void;
    onUpdate(): void;
    prevScene(): void;
    nextScene(): void;
    changeScene(index: number): void;
    setViewMatrix(m: CubismMatrix44): void;
}

declare class Live2dWidgetBase {
    protected static eventListener: {
        Head: any[];
        Body: any[];
        Left: any[];
        Right: any[];
        Other: any[];
    };
    static get model(): LAppDelegate;
    static get scene(): LAppLive2DManager;
    static get view(): LAppView;
    static init(options: LAppDefineOptions): Promise<void>;
    static release(): Promise<void>;
    protected static listener(): void;
    static on(type: HitArea, callback: () => void): void;
    static emit(type: string): void;
}
declare class Live2dWidget extends Live2dWidgetBase {
    static loadScript(): Promise<unknown>;
    static init(options: LAppDefineOptions): Promise<void>;
}

export { HitArea, LAppDefineOptions, Live2dWidget, Live2dWidgetBase, Live2dWidget as default };
