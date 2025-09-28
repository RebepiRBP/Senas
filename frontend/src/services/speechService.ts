export interface SpeechConfig {
  enabled: boolean
  rate: number
  pitch: number
  volume: number
  voice: string
  language: string
}

export interface ArithmeticSpeechConfig extends SpeechConfig {
  announceNumbers: boolean
  announceOperations: boolean
  announceResults: boolean
  resultDelay: number
}

class SpeechService {
  private synth: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []
  private config: SpeechConfig = {
    enabled: true,
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    voice: '',
    language: 'es-ES'
  }
  private isInitialized = false

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis
      this.initializeVoices()
    }
  }

  private initializeVoices(): void {
    if (!this.synth) return

    const loadVoices = () => {
      this.voices = this.synth!.getVoices()
      if (this.voices.length > 0) {
        this.isInitialized = true
        if (!this.config.voice) {
          const spanishVoice = this.voices.find(voice => 
            voice.lang.startsWith('es') || voice.name.toLowerCase().includes('spanish')
          )
          this.config.voice = spanishVoice?.name || this.voices[0]?.name || ''
        }
      }
    }

    loadVoices()
    
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  public isSupported(): boolean {
    return this.synth !== null
  }

  public isReady(): boolean {
    return this.isInitialized && this.voices.length > 0
  }

  public updateConfig(newConfig: Partial<SpeechConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  public getConfig(): SpeechConfig {
    return { ...this.config }
  }

  public speak(text: string, options?: Partial<SpeechConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth || !this.config.enabled || !text.trim()) {
        resolve()
        return
      }

      this.synth.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const finalConfig = { ...this.config, ...options }

      utterance.rate = finalConfig.rate
      utterance.pitch = finalConfig.pitch
      utterance.volume = finalConfig.volume
      utterance.lang = finalConfig.language

      if (finalConfig.voice && this.voices.length > 0) {
        const selectedVoice = this.voices.find(voice => voice.name === finalConfig.voice)
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
      }

      utterance.onend = () => resolve()
      utterance.onerror = () => reject(new Error('Speech synthesis error'))

      this.synth.speak(utterance)
    })
  }

  public speakDetection(prediction: string, confidence: number): Promise<void> {
    if (!this.config.enabled || !prediction || prediction.includes('Error') || 
        prediction.includes('no detecta') || prediction.includes('no válido')) {
      return Promise.resolve()
    }

    let text = prediction

    if (confidence < 0.7) {
      text = `${prediction}, con baja confianza`
    }

    return this.speak(text)
  }

  public speakArithmetic(operation: {
    numbers: string[]
    operators: string[]
    result?: number
  }, config?: ArithmeticSpeechConfig): Promise<void> {
    const finalConfig = { ...this.config, announceNumbers: true, announceOperations: true, announceResults: true, resultDelay: 1000, ...config }
    
    if (!finalConfig.enabled) {
      return Promise.resolve()
    }

    let text = ''

    if (finalConfig.announceNumbers && finalConfig.announceOperations) {
      const expression = operation.numbers.reduce((acc, num, index) => {
        if (index === 0) return num
        const operator = operation.operators[index - 1] || ''
        const operatorText = this.getOperatorText(operator)
        return `${acc} ${operatorText} ${num}`
      }, '')
      
      text = expression
    }

    if (operation.result !== undefined && finalConfig.announceResults) {
      text += ` es igual a ${operation.result}`
    }

    return this.speak(text.trim())
  }

  private getOperatorText(operator: string): string {
    const operatorMap: Record<string, string> = {
      '+': 'más',
      '-': 'menos',
      'x': 'por',
      '*': 'por',
      '/': 'entre',
      '÷': 'entre',
      '=': 'igual a'
    }
    return operatorMap[operator] || operator
  }

  public speakLearningFeedback(isCorrect: boolean, targetLabel: string, detectedLabel?: string): Promise<void> {
    if (!this.config.enabled) {
      return Promise.resolve()
    }

    let text = ''

    if (isCorrect) {
      const correctPhrases = [
        `Correcto, ${targetLabel}`,
        `Muy bien, ${targetLabel}`,
        `Perfecto, ${targetLabel}`,
        `Excelente, detectaste ${targetLabel}`
      ]
      text = correctPhrases[Math.floor(Math.random() * correctPhrases.length)]
    } else if (detectedLabel) {
      text = `Incorrecto. Detecté ${detectedLabel}, pero debería ser ${targetLabel}`
    } else {
      text = `Intenta hacer la seña ${targetLabel} de nuevo`
    }

    return this.speak(text)
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel()
    }
  }

  public pause(): void {
    if (this.synth) {
      this.synth.pause()
    }
  }

  public resume(): void {
    if (this.synth) {
      this.synth.resume()
    }
  }

  public isSpeaking(): boolean {
    return this.synth?.speaking || false
  }

  public isPaused(): boolean {
    return this.synth?.paused || false
  }
}

export const speechService = new SpeechService()