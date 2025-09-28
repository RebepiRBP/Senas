import { useRef, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, Target, RotateCcw, TrendingUp, Award, Zap } from 'lucide-react'
import CameraCapture, { CameraCaptureHandle } from './CameraCapture'
import { useLearningComparison } from '@/hooks/useLearningComparison'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

interface PracticeComparisonProps {
  modelId: string
  targetLabel: string
  isActive: boolean
  onStatsUpdate?: (isCorrect: boolean, confidence: number) => void
}

export default function PracticeComparison({
  modelId,
  targetLabel,
  isActive,
  onStatsUpdate
}: PracticeComparisonProps) {
  const cameraRef = useRef<CameraCaptureHandle>(null)
  const [sessionStats, setSessionStats] = useState({
    attempts: 0,
    successes: 0,
    streak: 0,
    maxStreak: 0,
    averageConfidence: 0,
    practiceTime: 0
  })

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<string>('')
  const [lastSpokenResult, setLastSpokenResult] = useState<{isCorrect: boolean, label: string} | null>(null)

  const {
    isCorrect,
    confidence,
    feedback,
    lastPrediction,
    recentHistory,
    performComparison,
    resetStats
  } = useLearningComparison(modelId, targetLabel)

  const { speakLearningFeedback } = useSpeechSynthesis()

  useEffect(() => {
    if (isActive && !sessionStartTime) {
      setSessionStartTime(Date.now())
    } else if (!isActive && sessionStartTime) {
      const practiceTime = Math.floor((Date.now() - sessionStartTime) / 1000)
      setSessionStats(prev => ({ ...prev, practiceTime: prev.practiceTime + practiceTime }))
      setSessionStartTime(null)
    }
  }, [isActive, sessionStartTime])

  useEffect(() => {
    if (feedback !== lastFeedback && feedback) {
      setLastFeedback(feedback)
      
      if (isCorrect && confidence > 0.9) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 2000)
      }

      const newAttempts = sessionStats.attempts + 1
      const newSuccesses = isCorrect ? sessionStats.successes + 1 : sessionStats.successes
      const newStreak = isCorrect ? sessionStats.streak + 1 : 0
      const newMaxStreak = Math.max(sessionStats.maxStreak, newStreak)
      const newAverage = ((sessionStats.averageConfidence * sessionStats.attempts) + confidence) / newAttempts

      setSessionStats(prev => ({
        ...prev,
        attempts: newAttempts,
        successes: newSuccesses,
        streak: newStreak,
        maxStreak: newMaxStreak,
        averageConfidence: newAverage
      }))

      if (lastSpokenResult?.isCorrect !== isCorrect || 
          lastSpokenResult?.label !== (lastPrediction || targetLabel)) {
        speakLearningFeedback(isCorrect, targetLabel, lastPrediction)
        setLastSpokenResult({isCorrect, label: lastPrediction || targetLabel})
      }

      onStatsUpdate?.(isCorrect, confidence)
    }
  }, [isCorrect, confidence, feedback, lastFeedback, lastPrediction, targetLabel, onStatsUpdate, sessionStats, speakLearningFeedback, lastSpokenResult])

  const handleFrame = useCallback((imageData: string, landmarks: any[]) => {
    if (!isActive || !landmarks || landmarks.length === 0) return
    performComparison(landmarks[0])
  }, [isActive, performComparison])

  const handleReset = () => {
    resetStats()
    setSessionStats({
      attempts: 0,
      successes: 0,
      streak: 0,
      maxStreak: 0,
      averageConfidence: 0,
      practiceTime: 0
    })
    setSessionStartTime(null)
    setLastFeedback('')
    setLastSpokenResult(null)
  }

  const successRate = sessionStats.attempts > 0 ? (sessionStats.successes / sessionStats.attempts * 100) : 0
  const confidenceLevel = sessionStats.averageConfidence * 100

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'text-green-600 bg-green-100 border-green-200'
    if (conf >= 75) return 'text-blue-600 bg-blue-100 border-blue-200'
    if (conf >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    return 'text-red-600 bg-red-100 border-red-200'
  }

  const getPerformanceLevel = () => {
    if (successRate >= 90) return { level: 'Experto', color: 'text-purple-600', icon: Award }
    if (successRate >= 75) return { level: 'Avanzado', color: 'text-green-600', icon: TrendingUp }
    if (successRate >= 50) return { level: 'Intermedio', color: 'text-blue-600', icon: Target }
    return { level: 'Principiante', color: 'text-gray-600', icon: Zap }
  }

  const performance = getPerformanceLevel()
  const PerformanceIcon = performance.icon

  return (
    <div className="relative">
      <CameraCapture
        ref={cameraRef}
        onFrame={handleFrame}
        showLandmarks={true}
        className="h-96 rounded-lg overflow-hidden"
      />

      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="text-center text-white animate-bounce">
            <Award className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
            <div className="text-2xl font-bold">¡Excelente!</div>
            <div className="text-sm opacity-80">Seña perfecta</div>
          </div>
        </div>
      )}

      {isActive && (
        <>
          <div className="absolute top-4 right-4 space-y-2">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${
              isCorrect
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-red-100 text-red-800 border-red-200'
            }`}>
              {isCorrect ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>{isCorrect ? '¡Correcto!' : 'Sigue practicando'}</span>
            </div>

            {confidence > 0 && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(confidence * 100)}`}>
                Confianza: {Math.round(confidence * 100)}%
              </div>
            )}

            {sessionStats.streak > 2 && (
              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium border border-purple-200 animate-pulse">
                Racha: {sessionStats.streak} 🔥
              </div>
            )}
          </div>

          <div className="absolute top-4 left-4">
            <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <Target className="h-4 w-4" />
                <span className="font-medium">Objetivo: {targetLabel}</span>
              </div>
              <div className="text-xs opacity-80">
                {recentHistory.length > 0 ? `Últimas detecciones: ${recentHistory.length}` : 'Comenzando práctica...'}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="absolute bottom-4 left-0 right-0">
        <div className="bg-gradient-to-t from-black via-black to-transparent text-white p-4 mx-4 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-3">
            <div>
              <div className="text-lg font-bold">{sessionStats.attempts}</div>
              <div className="text-xs opacity-80">Intentos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">{sessionStats.successes}</div>
              <div className="text-xs opacity-80">Éxitos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">{successRate.toFixed(1)}%</div>
              <div className="text-xs opacity-80">Precisión</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-400">{sessionStats.maxStreak}</div>
              <div className="text-xs opacity-80">Mejor racha</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PerformanceIcon className={`h-4 w-4 ${performance.color}`} />
              <span className={`text-sm font-medium ${performance.color}`}>
                {performance.level}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {feedback && (
                <div className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  {feedback}
                </div>
              )}
              <button
                onClick={handleReset}
                className="flex items-center space-x-1 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {lastPrediction && lastPrediction !== targetLabel && (
            <div className="mt-2 text-xs text-yellow-300">
              Detectado: "{lastPrediction}" → Objetivo: "{targetLabel}"
            </div>
          )}

          {confidenceLevel > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Confianza promedio</span>
                <span>{confidenceLevel.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-1">
                <div
                  className="bg-gradient-to-r from-blue-400 to-green-400 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(confidenceLevel, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}