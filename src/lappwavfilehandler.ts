export class LAppWavFileHandler {
  protected static _instance: LAppWavFileHandler = null
  
  pcmData: Array<Float32Array>
  userTimeSeconds: number
  lastRms: number
  sampleOffset: number
  wavFileInfo: WavFileInfo
  byteReader: ByteReader
  audio: HTMLAudioElement
  audioPlayPromise?: Promise<void>
  
  constructor() {
    this.pcmData = null
    this.userTimeSeconds = 0.0
    this.lastRms = 0.0
    this.sampleOffset = 0.0
    this.wavFileInfo = new WavFileInfo()
    this.byteReader = new ByteReader()
    this.audio = new Audio()
  }
  
  private loadFileToBytes = (arrayBuffer: ArrayBuffer): void => {
    this.byteReader._fileByte = arrayBuffer
    this.byteReader._fileDataView = new DataView(this.byteReader._fileByte)
    this.byteReader._fileSize = this.byteReader._fileByte.byteLength
    this.byteReader._readOffset = 0
  }
  
  /**
   * 返回类的实例（单一实例）。
   * 如果尚未创建实例，请在内部实例化它。
   *
   * @return 类的实例
   */
  public static getInstance(): LAppWavFileHandler {
    if (this._instance == null) {
      this._instance = new LAppWavFileHandler()
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
  
  public update(deltaTimeSeconds: number) {
    let goalOffset: number
    let rms: number
    
    // 在数据加载之前/到达文件末尾时不要更新
    if (
      this.pcmData == null ||
      this.sampleOffset >= this.wavFileInfo._samplesPerChannel
    ) {
      this.lastRms = 0.0
      return false
    }
    
    // 保持年龄后的状态
    this.userTimeSeconds += deltaTimeSeconds
    goalOffset = Math.floor(
      this.userTimeSeconds * this.wavFileInfo._samplingRate,
    )
    if (goalOffset > this.wavFileInfo._samplesPerChannel) {
      goalOffset = this.wavFileInfo._samplesPerChannel
    }
    
    // RMS测量
    rms = 0.0
    for (
      let channelCount = 0;
      channelCount < this.wavFileInfo._numberOfChannels;
      channelCount++
    ) {
      for (
        let sampleCount = this.sampleOffset;
        sampleCount < goalOffset;
        sampleCount++
      ) {
        const pcm = this.pcmData[channelCount][sampleCount]
        rms += pcm * pcm
      }
    }
    rms = Math.sqrt(
      rms /
      (this.wavFileInfo._numberOfChannels *
        (goalOffset - this.sampleOffset)),
    )
    
    this.lastRms = rms
    this.sampleOffset = goalOffset
    return true
  }
  
  public async start(filePath: string): Promise<boolean> {
    // 初始化样本位置参考位置
    this.sampleOffset = 0
    this.userTimeSeconds = 0.0
    
    // RMS重置值
    this.lastRms = 0.0
    
    this.playWavFile(filePath)
    return await this.loadWavFile(filePath)
  }
  
  public getRms(): number {
    return this.lastRms
  }
  
  public async loadWavFile(filePath: string): Promise<boolean> {
    let ret = false
    
    if (this.pcmData != null) {
      this.releasePcmData()
    }
    
    // 文件加载
    const asyncFileLoad = async () => {
      return fetch(filePath, { cache: 'no-cache' }).then(response => {
        return response.arrayBuffer()
      })
    }
    
    this.loadFileToBytes(await asyncFileLoad())
    
    // 如果文件加载失败或没有适合前导签名“RIFF”的大小，则失败
    if (this.byteReader._fileSize < 4) {
      return false
    }
    
    // 文件名
    this.wavFileInfo._fileName = filePath
    
    try {
      // 签名“RIFF”
      if (!this.byteReader.getCheckSignature('RIFF')) {
        ret = false
        throw new Error('Cannot find Signeture "RIFF".')
      }
      // 文件大小-8（跳过阅读）
      this.byteReader.get32LittleEndian()
      // 签名"WAVE"
      if (!this.byteReader.getCheckSignature('WAVE')) {
        ret = false
        throw new Error('Cannot find Signeture "WAVE".')
      }
      // 签名 "fmt "
      if (!this.byteReader.getCheckSignature('fmt ')) {
        ret = false
        throw new Error('Cannot find Signeture "fmt".')
      }
      // fmt区块大小
      const fmtChunkSize = this.byteReader.get32LittleEndian()
      // 不接受 1（线性 PCM）以外的格式 ID。
      if (this.byteReader.get16LittleEndian() != 1) {
        ret = false
        throw new Error('File is not linear PCM.')
      }
      // 通道数
      this.wavFileInfo._numberOfChannels = this.byteReader.get16LittleEndian()
      // 采样率
      this.wavFileInfo._samplingRate = this.byteReader.get32LittleEndian()
      // 数据速度 [字节/秒]（跳过读取）
      this.byteReader.get32LittleEndian()
      // 块大小（跳过读取）
      this.byteReader.get16LittleEndian()
      // 量化位数
      this.wavFileInfo._bitsPerSample = this.byteReader.get16LittleEndian()
      // 跳过 FMT 块扩展
      if (fmtChunkSize > 16) {
        this.byteReader._readOffset += fmtChunkSize - 16
      }
      // "data"跳过阅读，直到出现块
      while (!this.byteReader.getCheckSignature('data') && this.byteReader._readOffset < this.byteReader._fileSize) {
        this.byteReader._readOffset += this.byteReader.get32LittleEndian() + 4
      }
      // “data”块未出现在文件中
      if (this.byteReader._readOffset >= this.byteReader._fileSize) {
        ret = false
        throw new Error('Cannot find "data" Chunk.')
      }
      // 样品数量
      {
        const dataChunkSize = this.byteReader.get32LittleEndian()
        this.wavFileInfo._samplesPerChannel = (dataChunkSize * 8) / (this.wavFileInfo._bitsPerSample * this.wavFileInfo._numberOfChannels)
      }
      
      // 空间分配
      this.pcmData = new Array(this.wavFileInfo._numberOfChannels)
      for (let count = 0; count < this.wavFileInfo._numberOfChannels; count++) {
        this.pcmData[count] = new Float32Array(this.wavFileInfo._samplesPerChannel)
      }
      // 波形数据采集
      for (let samples = 0; samples < this.wavFileInfo._samplesPerChannel; samples++) {
        for (let index = 0; index < this.wavFileInfo._numberOfChannels; index++) {
          this.pcmData[index][samples] = this.getPcmSample()
        }
      }
      
      ret = true
    } catch ( e ) {
      console.error(e)
    }
    
    return ret
  }
  
  public playWavFile(filePath: string) {
    this.audio.src = filePath
    this.audioPlayPromise = this.audio.play()
  }
  
  public getPcmSample(): number {
    let pcm32
    
    // 扩展到 32 位宽度，然后舍入到 -1~1 范围
    switch (this.wavFileInfo._bitsPerSample) {
      case 8:
        pcm32 = this.byteReader.get8() - 128
        pcm32 <<= 24
        break
      case 16:
        pcm32 = this.byteReader.get16LittleEndian() << 16
        break
      case 24:
        pcm32 = this.byteReader.get24LittleEndian() << 8
        break
      default:
        // 不支持的位宽
        pcm32 = 0
        break
    }
    
    return pcm32 / 2147483647 //Number.MAX_VALUE;
  }
  
  public releasePcmData(): void {
    for (
      let channelCount = 0;
      channelCount < this.wavFileInfo._numberOfChannels;
      channelCount++
    ) {
      delete this.pcmData[channelCount]
    }
    delete this.pcmData
    this.pcmData = null
  }
  
  public release() {
    this.audioPlayPromise?.then(()=> this.audio.pause())
  }
}

export class WavFileInfo {
  _fileName: string ///< 文件名
  _numberOfChannels: number ///< 通道数
  _bitsPerSample: number ///< 每个样本的位数
  _samplingRate: number ///< 采样率
  _samplesPerChannel: number ///< 每通道总采样数
  constructor() {
    this._fileName = ''
    this._numberOfChannels = 0
    this._bitsPerSample = 0
    this._samplingRate = 0
    this._samplesPerChannel = 0
  }
}

export class ByteReader {
  _fileByte: ArrayBuffer ///< 加载文件的字节数
  _fileDataView: DataView
  _fileSize: number ///< 文件大小
  _readOffset: number ///< 文件引用位置
  
  constructor() {
    this._fileByte = null
    this._fileDataView = null
    this._fileSize = 0
    this._readOffset = 0
  }
  
  /**
   * @brief 8 位读取
   * @return Csm::csmUint8 8 位值读取
   */
  public get8(): number {
    const ret = this._fileDataView.getUint8(this._readOffset)
    this._readOffset++
    return ret
  }
  
  /**
   * @brief 16 位读取（小端序）
   * @return Csm::csmUint16 16 位值读取
   */
  public get16LittleEndian(): number {
    const ret =
      (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView.getUint8(this._readOffset)
    this._readOffset += 2
    return ret
  }
  
  /**
   * @brief 24 位读取（小端序）
   * @return Csm::csmUint32 读取 24 位值（设置为较低的 24 位）
   */
  public get24LittleEndian(): number {
    const ret =
      (this._fileDataView.getUint8(this._readOffset + 2) << 16) |
      (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView.getUint8(this._readOffset)
    this._readOffset += 3
    return ret
  }
  
  /**
   * @brief 32 位读取（小端序）
   * @return Csm::csmUint32 32 位值读取
   */
  public get32LittleEndian(): number {
    const ret =
      (this._fileDataView.getUint8(this._readOffset + 3) << 24) |
      (this._fileDataView.getUint8(this._readOffset + 2) << 16) |
      (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView.getUint8(this._readOffset)
    this._readOffset += 4
    return ret
  }
  
  /**
   * @brief 签名检索和与引用字符串的匹配检查
   * @param[in] reference 要检查的签名字符串
   * @retval  true    匹配
   * @retval  false   不匹配
   */
  public getCheckSignature(reference: string): boolean {
    const getSignature: Uint8Array = new Uint8Array(4)
    const referenceString: Uint8Array = new TextEncoder().encode(reference)
    if (reference.length != 4) {
      return false
    }
    for (let signatureOffset = 0; signatureOffset < 4; signatureOffset++) {
      getSignature[signatureOffset] = this.get8()
    }
    return (
      getSignature[0] == referenceString[0] &&
      getSignature[1] == referenceString[1] &&
      getSignature[2] == referenceString[2] &&
      getSignature[3] == referenceString[3]
    )
  }
}
