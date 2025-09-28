import { useRef, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, Target, Camera, CameraOff, Play, RotateCcw, Award, Zap, TrendingUp, Star } from 'lucide-react'
import CameraCapture, { CameraCaptureHandle } from './CameraCapture'
import { useLearningComparison } from '@/hooks/useLearningComparison'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

interface EnhancedPracticeComparisonProps {
  modelId: string
  targetLabel: string
  isActive: boolean
  onStatsUpdate?: (isCorrect: boolean, confidence: number) => void
  onNextLabel?: () => void
}

export default function EnhancedPracticeComparison({
  modelId,
  targetLabel,
  isActive,
  onStatsUpdate,
  onNextLabel
}: EnhancedPracticeComparisonProps) {
  const cameraRef = useRef<CameraCaptureHandle>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [currentResult, setCurrentResult] = useState<{isCorrect: boolean, confidence: number, prediction: string} | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    attempts: 0,
    successes: 0,
    streak: 0,
    maxStreak: 0,
    averageConfidence: 0
  })

  const {
    performComparison,
    resetStats
  } = useLearningComparison(modelId, targetLabel)

  const { speakLearningFeedback } = useSpeechSynthesis()

  const startCountdown = useCallback(() => {
    if (countdown || isCapturing || showResult) return

    let count = 3
    setCountdown(count)

    const interval = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        setCountdown(0)
        setIsCapturing(true)
        clearInterval(interval)
        setTimeout(() => {
          captureAndAnalyze()
        }, 1500)
      }
    }, 1000)
  }, [countdown, isCapturing, showResult])

  const captureAndAnalyze = useCallback(async () => {
    if (!cameraRef.current || !targetLabel) return

    const snapshot = cameraRef.current.takeSnapshot()
    if (!snapshot || !snapshot.landmarks || snapshot.landmarks.length === 0) {
      setCurrentResult({
        isCorrect: false,
        confidence: 0,
        prediction: 'No se detectó mano'
      })
      setShowResult(true)
      setIsCapturing(false)
      setCountdown(null)
      return
    }

    try {
      const response = await performComparison(snapshot.landmarks[0])

      setTimeout(() => {
        const isMatch = response?.prediction?.toLowerCase() === targetLabel.toLowerCase()
        const conf = response?.confidence || 0

        const result = {
          isCorrect: isMatch,
          confidence: conf,
          prediction: response?.prediction || 'Error'
        }

        setCurrentResult(result)
        setShowResult(true)
        setIsCapturing(false)
        setCountdown(null)

        setSessionStats(prev => {
          const newAttempts = prev.attempts + 1
          const newSuccesses = result.isCorrect ? prev.successes + 1 : prev.successes
          const newStreak = result.isCorrect ? prev.streak + 1 : 0
          const newMaxStreak = Math.max(prev.maxStreak, newStreak)
          const newAvgConfidence = (prev.averageConfidence * prev.attempts + result.confidence) / newAttempts

          return {
            attempts: newAttempts,
            successes: newSuccesses,
            streak: newStreak,
            maxStreak: newMaxStreak,
            averageConfidence: newAvgConfidence
          }
        })

        onStatsUpdate?.(result.isCorrect, result.confidence)
        speakLearningFeedback(result.isCorrect, targetLabel, result.prediction)

        if (result.isCorrect && result.confidence > 0.8) {
          setShowCelebration(true)
          setTimeout(() => {
            setShowCelebration(false)
            setShowResult(false)
            onNextLabel?.()
          }, 2500)
        }
      }, 1000)
    } catch (error) {
      console.error('Error en análisis:', error)
      setCurrentResult({
        isCorrect: false,
        confidence: 0,
        prediction: 'Error en análisis'
      })
      setShowResult(true)
      setIsCapturing(false)
      setCountdown(null)
    }
  }, [targetLabel, performComparison, onStatsUpdate, speakLearningFeedback, onNextLabel])

  const restartPractice = useCallback(() => {
    setShowResult(false)
    setCurrentResult(null)
    setCountdown(null)
    setIsCapturing(false)
    setShowCelebration(false)
  }, [])

  useEffect(() => {
    if (isActive && !countdown && !isCapturing && !showResult) {
      const autoTimer = setTimeout(() => {
        startCountdown()
      }, 2000)
      return () => clearTimeout(autoTimer)
    }
  }, [isActive, countdown, isCapturing, showResult, startCountdown])

  useEffect(() => {
    if (targetLabel) {
      resetStats()
      restartPractice()
      setSessionStats({
        attempts: 0,
        successes: 0,
        streak: 0,
        maxStreak: 0,
        averageConfidence: 0
      })
    }
  }, [targetLabel, resetStats, restartPractice])

  const getCountdownColor = (count: number) => {
    if (count === 3) return 'text-red-500'
    if (count === 2) return 'text-yellow-500'
    if (count === 1) return 'text-green-500'
    return 'text-blue-500'
  }

  const getPerformanceLevel = () => {
    const successRate = sessionStats.attempts > 0 ? (sessionStats.successes / sessionStats.attempts * 100) : 0
    if (successRate >= 90) return { level: 'Experto', color: 'text-purple-600', icon: Award }
    if (successRate >= 75) return { level: 'Avanzado', color: 'text-green-600', icon: Star }
    if (successRate >= 50) return { level: 'Intermedio', color: 'text-blue-600', icon: TrendingUp }
    return { level: 'Principiante', color: 'text-gray-600', icon: Zap }
  }

  const performance = getPerformanceLevel()
  const PerformanceIcon = performance.icon

  return (
    <div className="relative h-80 sm:h-96 lg:h-[28rem] rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 shadow-2xl">
      <CameraCapture
        ref={cameraRef}
        showLandmarks={true}
        className="h-full rounded-3xl overflow-hidden"
      />

      {countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm z-20">
          <div className="text-center">
            <div className={`text-6xl sm:text-7xl lg:text-9xl font-bold ${getCountdownColor(countdown)} drop-shadow-2xl animate-bounce`}>
              {countdown}
            </div>
            <div className="text-white text-lg sm:text-xl lg:text-2xl mt-4 bg-black bg-opacity-50 px-6 py-3 rounded-2xl backdrop-blur-sm">
              Prepárate para: <span className="font-bold text-yellow-300">{targetLabel}</span>
            </div>
          </div>
        </div>
      )}

      {countdown === 0 && isCapturing && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-600 bg-opacity-40 backdrop-blur-sm z-20">
          <div className="text-center text-white">
            <Camera className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 mx-auto mb-4 animate-pulse drop-shadow-lg" />
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold drop-shadow mb-2">¡AHORA!</div>
            <div className="text-base sm:text-lg lg:text-xl bg-black bg-opacity-50 px-4 py-2 rounded-lg backdrop-blur-sm">
              Mantén la seña estable
            </div>
          </div>
        </div>
      )}

      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-opacity-90 backdrop-blur-sm z-30">
          <div className="text-center text-white animate-bounce">
            <Award className="h-20 w-20 sm:h-24 sm:w-24 lg:h-32 lg:w-32 mx-auto mb-6 text-yellow-200 animate-spin" />
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">¡PERFECTO!</div>
            <div className="text-base sm:text-lg lg:text-xl opacity-90">Seña dominada</div>
            <div className="flex justify-center space-x-2 mt-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-200 animate-pulse" fill="currentColor" />
              ))}
            </div>
          </div>
        </div>
      )}

      {showResult && currentResult && !showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-lg z-20">
          <div className="text-center text-white bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8 lg:p-10 rounded-3xl max-w-sm sm:max-w-md mx-4 shadow-2xl border border-gray-700">
            <div className="mb-6">
              {currentResult.isCorrect ? (
                <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 text-green-400 mx-auto animate-bounce" />
              ) : (
                <XCircle className="h-16 w-16 sm:h-20 sm:w-20 text-red-400 mx-auto animate-pulse" />
              )}
            </div>

            <div className="text-2xl sm:text-3xl font-bold mb-4">
              {currentResult.isCorrect ? '¡CORRECTO!' : 'Inténtalo otra vez'}
            </div>

            <div className="text-base sm:text-lg mb-4 text-gray-300">
              Confianza: <span className="font-bold text-white">{Math.round(currentResult.confidence * 100)}%</span>
            </div>

            {!currentResult.isCorrect && (
              <div className="text-sm sm:text-base text-yellow-300 mb-6 bg-black bg-opacity-30 p-3 rounded-xl">
                Detecté: <span className="font-bold">"{currentResult.prediction}"</span><br/>
                Objetivo: <span className="font-bold">"{targetLabel}"</span>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              {!currentResult.isCorrect && (
                <button
                  onClick={() => {
                    setShowResult(false)
                    setTimeout(() => startCountdown(), 1000)
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg text-sm sm:text-base font-medium"
                >
                  <Play className="h-4 w-4 inline mr-2" />
                  Reintentar
                </button>
              )}

              <button
                onClick={restartPractice}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg text-sm sm:text-base font-medium"
              >
                <RotateCcw className="h-4 w-4 inline mr-2" />
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 sm:px-4 py-2 rounded-xl backdrop-blur-sm border border-gray-600">
        <div className="flex items-center space-x-2">
          <Target className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span className="font-medium text-sm sm:text-base truncate max-w-32 sm:max-w-none">
            {targetLabel}
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 sm:px-4 py-2 rounded-xl backdrop-blur-sm text-xs sm:text-sm border border-gray-600">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{sessionStats.attempts}↗</span>
          <span className="text-green-400">{sessionStats.successes}✓</span>
        </div>
      </div>

      {sessionStats.streak > 1 && (
        <div className="absolute top-16 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-bold animate-pulse">
          🔥 Racha: {sessionStats.streak}
        </div>
      )}

      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="text-center text-white">
            <CameraOff className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-4 text-gray-400" />
            <div className="text-xl sm:text-2xl font-bold mb-2">Práctica detenida</div>
            <div className="text-sm sm:text-base text-gray-300">Presiona "Iniciar" para continuar</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-0 right-0 px-4">
        <div className="bg-gradient-to-t from-black via-black to-transparent text-white p-4 rounded-2xl backdrop-blur-sm border border-gray-700 shadow-2xl">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-center mb-3">
            <div className="bg-black bg-opacity-30 rounded-xl p-2">
              <div className="text-lg sm:text-xl font-bold">{sessionStats.attempts}</div>
              <div className="text-xs text-gray-300">Intentos</div>
            </div>
            <div className="bg-black bg-opacity-30 rounded-xl p-2">
              <div className="text-lg sm:text-xl font-bold text-green-400">{sessionStats.successes}</div>
              <div className="text-xs text-gray-300">Éxitos</div>
            </div>
            <div className="bg-black bg-opacity-30 rounded-xl p-2">
              <div className="text-lg sm:text-xl font-bold text-purple-400">
                {sessionStats.attempts > 0 ? Math.round((sessionStats.successes / sessionStats.attempts) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-300">Precisión</div>
            </div>
            <div className="bg-black bg-opacity-30 rounded-xl p-2 hidden sm:block">
              <div className="text-lg sm:text-xl font-bold text-orange-400">{sessionStats.maxStreak}</div>
              <div className="text-xs text-gray-300">Mejor</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PerformanceIcon className={`h-4 w-4 ${performance.color}`} />
              <span className={`text-xs sm:text-sm font-medium ${performance.color}`}>
                {performance.level}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {sessionStats.averageConfidence > 0 && (
                <div className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                  Confianza: {Math.round(sessionStats.averageConfidence * 100)}%
                </div>
              )}

              {isActive && !countdown && !isCapturing && !showResult && (
                <button
                  onClick={startCountdown}
                  className="flex items-center space-x-1 text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full transition-colors"
                >
                  <Play className="h-3 w-3" />
                  <span className="hidden sm:inline">Practicar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}