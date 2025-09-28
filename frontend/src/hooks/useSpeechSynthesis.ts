import { useState, useEffect, useCallback } from 'react'
import { speechService, SpeechConfig } from '@/services/speechService'

export const useSpeechSynthesis = (initialConfig?: Partial<SpeechConfig>) => {
  const [isSupported, setIsSupported] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [config, setConfig] = useState<SpeechConfig>(speechService.getConfig())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsSupported(speechService.isSupported())
    
    if (initialConfig) {
      speechService.updateConfig(initialConfig)
      setConfig(speechService.getConfig())
    }

    const checkReady = () => {
      setIsReady(speechService.isReady())
      setVoices(speechService.getVoices())
    }

    checkReady()

    const interval = setInterval(checkReady, 100)
    
    const statusInterval = setInterval(() => {
      setIsSpeaking(speechService.isSpeaking())
      setIsPaused(speechService.isPaused())
    }, 100)

    return () => {
      clearInterval(interval)
      clearInterval(statusInterval)
    }
  }, [initialConfig])

  const speak = useCallback(async (text: string, options?: Partial<SpeechConfig>) => {
    if (!isSupported || !isReady) {
      setError('Speech synthesis not available')
      return false
    }

    try {
      setError(null)
      await speechService.speak(text, options)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speech synthesis failed')
      return false
    }
  }, [isSupported, isReady])

  const speakDetection = useCallback(async (prediction: string, confidence: number) => {
    if (!isSupported || !isReady) return false

    try {
      setError(null)
      await speechService.speakDetection(prediction, confidence)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speech synthesis failed')
      return false
    }
  }, [isSupported, isReady])

  const speakArithmetic = useCallback(async (operation: {
    numbers: string[]
    operators: string[]
    result?: number
  }) => {
    if (!isSupported || !isReady) return false

    try {
      setError(null)
      await speechService.speakArithmetic(operation)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speech synthesis failed')
      return false
    }
  }, [isSupported, isReady])

  const speakLearningFeedback = useCallback(async (
    isCorrect: boolean, 
    targetLabel: string, 
    detectedLabel?: string
  ) => {
    if (!isSupported || !isReady) return false

    try {
      setError(null)
      await speechService.speakLearningFeedback(isCorrect, targetLabel, detectedLabel)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speech synthesis failed')
      return false
    }
  }, [isSupported, isReady])

  const updateConfig = useCallback((newConfig: Partial<SpeechConfig>) => {
    speechService.updateConfig(newConfig)
    setConfig(speechService.getConfig())
  }, [])

  const stop = useCallback(() => {
    speechService.stop()
    setIsSpeaking(false)
  }, [])

  const pause = useCallback(() => {
    speechService.pause()
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    speechService.resume()
    setIsPaused(false)
  }, [])

  const toggleEnabled = useCallback(() => {
    const newEnabled = !config.enabled
    updateConfig({ enabled: newEnabled })
    if (!newEnabled) {
      stop()
    }
  }, [config.enabled, updateConfig, stop])

  return {
    isSupported,
    isReady,
    isSpeaking,
    isPaused,
    voices,
    config,
    error,
    speak,
    speakDetection,
    speakArithmetic,
    speakLearningFeedback,
    updateConfig,
    stop,
    pause,
    resume,
    toggleEnabled
  }
}