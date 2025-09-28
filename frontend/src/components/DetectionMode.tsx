import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings, TrendingUp, Activity, Target, Zap, Eye, BarChart3, Clock } from 'lucide-react'
import CameraCapture, { CameraCaptureHandle } from './CameraCapture'
import ArithmeticMode from './ArithmeticMode'
import SpeechControls from './SpeechControls'
import { api } from '@/services/api'
import { Model } from '@/types'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

interface DetectionModeProps {
  modelId: string
  modelName: string
  model?: Model
}

interface PredictionResult {
  prediction: string
  confidence: number
  probabilities: Record<string, number>
  timestamp: string
}

export default function DetectionMode({ modelId, modelName, model }: DetectionModeProps) {
  if (model?.type === 'arithmetic') {
    return <ArithmeticMode modelId={modelId} modelName={modelName} />
  }

  const [isDetecting, setIsDetecting] = useState(false)
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null)
  const [predictionHistory, setPredictionHistory] = useState<PredictionResult[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6)
  const [detectionInterval, setDetectionInterval] = useState(300)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionStats, setSessionStats] = useState({
    totalPredictions: 0,
    correctPredictions: 0,
    averageConfidence: 0,
    sessionTime: 0
  })

  const cameraRef = useRef<CameraCaptureHandle>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpokenPrediction = useRef<string>('')
  const speechCooldown = useRef<number>(0)
  const sessionStartTime = useRef<number>(Date.now())

  const { speakDetection } = useSpeechSynthesis()

  const performDetection = useCallback(async () => {
    if (!cameraRef.current) return

    const snapshot = cameraRef.current.takeSnapshot()
    if (!snapshot || !snapshot.landmarks || snapshot.landmarks.length === 0) {
      setCurrentPrediction(null)
      return
    }

    try {
      setError(null)
      const response = await api.post(`/models/${modelId}/predict`, {
        landmarks: snapshot.landmarks[0]
      })

      const result: PredictionResult = {
        prediction: response.data.prediction,
        confidence: response.data.confidence,
        probabilities: response.data.probabilities || {},
        timestamp: new Date().toISOString()
      }

      const shouldShowResult = result.confidence >= confidenceThreshold &&
        !["No se detecta seña clara", "Mano no detectada correctamente", "Gesto no válido"].includes(result.prediction)

      if (shouldShowResult) {
        setCurrentPrediction(result)
        setPredictionHistory(prev => {
          const newHistory = [result, ...prev.slice(0, 9)]
          return newHistory.filter((item, index, arr) =>
            index === 0 || arr[index - 1].prediction !== item.prediction ||
            new Date(item.timestamp).getTime() - new Date(arr[index - 1].timestamp).getTime() > 2000
          )
        })

        setSessionStats(prev => ({
          totalPredictions: prev.totalPredictions + 1,
          correctPredictions: prev.correctPredictions + (result.confidence > 0.8 ? 1 : 0),
          averageConfidence: (prev.averageConfidence * prev.totalPredictions + result.confidence) / (prev.totalPredictions + 1),
          sessionTime: Math.floor((Date.now() - sessionStartTime.current) / 1000)
        }))

        const now = Date.now()
        if (soundEnabled &&
          result.prediction !== lastSpokenPrediction.current &&
          now - speechCooldown.current > 1500 &&
          result.confidence > 0.7) {
          speakDetection(result.prediction, result.confidence)
          lastSpokenPrediction.current = result.prediction
          speechCooldown.current = now
        }
      } else {
        setCurrentPrediction({
          ...result,
          prediction: result.prediction === "NO_GESTURE" ? "Sin seña detectada" : result.prediction
        })
      }
    } catch (err: any) {
      console.error('Detection error:', err)
      setError('Error en la detección: ' + (err.response?.data?.detail || err.message))
    }
  }, [modelId, confidenceThreshold, soundEnabled, speakDetection])

  const startDetection = useCallback(() => {
    if (isDetecting) return

    setIsDetecting(true)
    setError(null)
    lastSpokenPrediction.current = ''
    speechCooldown.current = 0
    sessionStartTime.current = Date.now()
    setSessionStats({
      totalPredictions: 0,
      correctPredictions: 0,
      averageConfidence: 0,
      sessionTime: 0
    })

    detectionIntervalRef.current = setInterval(performDetection, detectionInterval)
  }, [isDetecting, performDetection, detectionInterval])

  const stopDetection = useCallback(() => {
    setIsDetecting(false)
    setCurrentPrediction(null)
    lastSpokenPrediction.current = ''
    speechCooldown.current = 0

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }, [])

  const clearHistory = useCallback(() => {
    setPredictionHistory([])
    setCurrentPrediction(null)
    lastSpokenPrediction.current = ''
    setSessionStats({
      totalPredictions: 0,
      correctPredictions: 0,
      averageConfidence: 0,
      sessionTime: 0
    })
  }, [])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    return 'text-red-600 bg-red-100 border-red-200'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Muy Alta'
    if (confidence >= 0.8) return 'Alta'
    if (confidence >= 0.7) return 'Buena'
    if (confidence >= 0.6) return 'Media'
    return 'Baja'
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const successRate = sessionStats.totalPredictions > 0 
    ? Math.round((sessionStats.correctPredictions / sessionStats.totalPredictions) * 100) 
    : 0

  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  return (
    <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
      <div className="text-center mb-8 lg:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
          <Activity className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          Detección en Tiempo Real
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Modelo: {modelName}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-red-500 rounded-full mr-3 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-blue-600">{sessionStats.totalPredictions}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Predicciones</p>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-xl">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-green-600">{successRate}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Precisión</p>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-xl">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-purple-600">
              {Math.round((sessionStats.averageConfidence || 0) * 100)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Confianza</p>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-orange-600">
              {formatTime(sessionStats.sessionTime)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Tiempo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Vista de Cámara
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <SpeechControls mode="detection" />
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                    title="Configuración"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  {!isDetecting ? (
                    <button
                      onClick={startDetection}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg"
                    >
                      <Play className="h-4 w-4" />
                      <span className="hidden sm:inline">Iniciar</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopDetection}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <Pause className="h-4 w-4" />
                      <span className="hidden sm:inline">Detener</span>
                    </button>
                  )}
                  <button
                    onClick={clearHistory}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">Limpiar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <CameraCapture
                ref={cameraRef}
                showLandmarks={true}
                className="h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden"
              />

              {currentPrediction && (
                <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="text-center">
                    <div className="text-2xl lg:text-3xl font-bold text-indigo-600 mb-3">
                      {currentPrediction.prediction}
                    </div>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${
                      getConfidenceColor(currentPrediction.confidence)
                    }`}>
                      {Math.round(currentPrediction.confidence * 100)}% - {getConfidenceLabel(currentPrediction.confidence)}
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      {new Date(currentPrediction.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}

              {isDetecting && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                    Detección activa
                  </div>
                </div>
              )}
            </div>
          </div>

          {showSettings && (
            <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-semibold">Configuración de Detección</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Umbral de Confianza: {Math.round(confidenceThreshold * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="0.9"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>30%</span>
                    <span>90%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo de Detección: {detectionInterval}ms
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={detectionInterval}
                    onChange={(e) => setDetectionInterval(parseInt(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Rápido</span>
                    <span>Lento</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="rounded accent-purple-600"
                  />
                  <span className="text-sm">Habilitar síntesis de voz</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Historial
              </h3>
            </div>

            <div className="p-6">
              {predictionHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No hay detecciones aún</p>
                  <p className="text-sm text-gray-400 mt-1">Inicia la detección para ver resultados</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {predictionHistory.map((prediction, index) => (
                    <div
                      key={`${prediction.timestamp}-${index}`}
                      className={`p-4 rounded-xl border transition-all ${
                        index === 0 ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-gray-900 truncate mr-2">
                          {prediction.prediction}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(prediction.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        getConfidenceColor(prediction.confidence)
                      }`}>
                        {Math.round(prediction.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {currentPrediction && Object.keys(currentPrediction.probabilities).length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Probabilidades
                </h3>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {Object.entries(currentPrediction.probabilities)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([label, probability]) => (
                      <div key={label} className="flex items-center space-x-3">
                        <div className="w-16 text-sm font-medium text-gray-700 truncate">
                          {label}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${probability * 100}%` }}
                          />
                        </div>
                        <div className="w-12 text-xs text-gray-600 text-right">
                          {Math.round(probability * 100)}%
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Consejos para mejor detección
            </h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Mantén la mano estable durante 1-2 segundos</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Asegúrate de tener buena iluminación</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Coloca la mano completamente dentro del marco</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Realiza gestos claros y bien definidos</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Evita movimientos muy rápidos</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}