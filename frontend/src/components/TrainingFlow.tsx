import { useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle, Circle, RotateCcw, Play, ArrowRight, Settings, Plus, Minus, X, Save, RotateCw, Sparkles, Target, Clock, Zap, Activity, Award, TrendingUp, Camera, Pause as PauseIcon } from 'lucide-react'
import CameraCapture, { CameraCaptureHandle } from './CameraCapture'
import { TrainingData } from '@/types'

interface TrainingFlowProps {
  labels: string[]
  samplesPerLabel: number
  onTrainingComplete: (data: TrainingData[]) => void
  onCancel: () => void
}

interface LabelConfig {
  label: string
  targetSamples: number
  enabled: boolean
}

export default function TrainingFlow({
  labels,
  samplesPerLabel,
  onTrainingComplete,
  onCancel
}: TrainingFlowProps) {
  const [labelConfigs, setLabelConfigs] = useState<LabelConfig[]>(() =>
    labels.map(label => ({
      label,
      targetSamples: samplesPerLabel,
      enabled: true
    }))
  )

  const [currentLabelIndex, setCurrentLabelIndex] = useState(0)
  const [trainingData, setTrainingData] = useState<TrainingData[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAutoCapture, setIsAutoCapture] = useState(false)
  const [capturedSamples, setCapturedSamples] = useState<Record<string, number>>({})
  const [showTrainingConfirm, setShowTrainingConfirm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showIndividualConfig, setShowIndividualConfig] = useState(false)
  const [captureInterval, setCaptureInterval] = useState(300)
  const [positionVariance, setPositionVariance] = useState(false)
  const [qualityFilter, setQualityFilter] = useState(false)
  const [burstMode, setBurstMode] = useState(false)
  const [burstCount, setBurstCount] = useState(5)
  const [globalSamples, setGlobalSamples] = useState(samplesPerLabel)
  const [tempLabelConfigs, setTempLabelConfigs] = useState<LabelConfig[]>(labelConfigs)

  const cameraRef = useRef<CameraCaptureHandle>(null)
  const autoCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCapturingRef = useRef(false)
  const lastCaptureTime = useRef(0)
  const lastHandPosition = useRef<{x: number, y: number} | null>(null)
  const captureHistory = useRef<Array<{position: {x: number, y: number}, time: number}>>([])
  const positionResetTimeout = useRef<NodeJS.Timeout | null>(null)
  const consecutiveStaticCaptures = useRef(0)
  const maxConsecutiveStaticCaptures = 5

  const enabledLabels = labelConfigs.filter(config => config.enabled)
  const currentLabelConfig = enabledLabels[currentLabelIndex]
  const currentLabel = currentLabelConfig?.label
  const totalTargetSamples = enabledLabels.reduce((sum, config) => sum + config.targetSamples, 0)
  const currentTotalCaptured = Object.values(capturedSamples).reduce((sum, count) => sum + count, 0)
  const currentLabelCaptured = capturedSamples[currentLabel] || 0
  const allLabelsCompleted = enabledLabels.every(config =>
    (capturedSamples[config.label] || 0) >= config.targetSamples
  )

  const resetPositionMemory = useCallback(() => {
    lastHandPosition.current = null
    captureHistory.current = []
    consecutiveStaticCaptures.current = 0
    if (positionResetTimeout.current) {
      clearTimeout(positionResetTimeout.current)
    }
    positionResetTimeout.current = setTimeout(() => {
      lastHandPosition.current = null
      consecutiveStaticCaptures.current = 0
    }, 2000)
  }, [])

  const handleCapture = useCallback(() => {
    if (isCapturingRef.current || !cameraRef.current || !currentLabel) return

    const now = Date.now()
    if (now - lastCaptureTime.current < captureInterval) return

    const snapshot = cameraRef.current.takeSnapshot()
    if (!snapshot || snapshot.landmarks.length === 0) return

    const landmarks = snapshot.landmarks[0]
    if (qualityFilter && !isHighQualityCapture(landmarks)) return

    let shouldCapture = true
    if (positionVariance) {
      const hasMovement = hasSignificantPositionChange(landmarks)
      if (!hasMovement) {
        consecutiveStaticCaptures.current++
        if (consecutiveStaticCaptures.current > maxConsecutiveStaticCaptures) {
          shouldCapture = false
        }
      } else {
        consecutiveStaticCaptures.current = 0
      }
    }

    if (!shouldCapture) return

    isCapturingRef.current = true
    lastCaptureTime.current = now

    const sample: TrainingData = {
      id: `${currentLabel}_${Date.now()}_${Math.random()}`,
      label: currentLabel,
      imageData: snapshot.imageData,
      landmarks: landmarks,
      timestamp: new Date().toISOString()
    }

    setTrainingData(prev => [...prev, sample])
    setCapturedSamples(prev => {
      const newCount = (prev[currentLabel] || 0) + 1
      return { ...prev, [currentLabel]: newCount }
    })

    updateLastHandPosition(landmarks)
    updateCaptureHistory(landmarks)

    setTimeout(() => {
      isCapturingRef.current = false
    }, 30)

  }, [currentLabel, captureInterval, positionVariance, qualityFilter])

  const isHighQualityCapture = useCallback((landmarks: any[]) => {
    try {
      if (landmarks.length !== 21) return false

      const coords = landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }))
      const wrist = coords[0]

      let validLandmarks = 0
      for (const coord of coords) {
        if (coord.x >= 0 && coord.x <= 1 && coord.y >= 0 && coord.y <= 1) {
          validLandmarks++
        }
      }

      if (validLandmarks < 15) return false

      const fingertips = [4, 8, 12, 16, 20]
      let visibleFingertips = 0

      for (const tipIndex of fingertips) {
        const tip = coords[tipIndex]
        const distance = Math.sqrt(
          Math.pow(tip.x - wrist.x, 2) +
          Math.pow(tip.y - wrist.y, 2) +
          Math.pow(tip.z - wrist.z, 2)
        )

        if (distance > 0.01 && distance < 0.6) {
          visibleFingertips++
        }
      }

      return visibleFingertips >= 3
    } catch {
      return true
    }
  }, [])

  const hasSignificantPositionChange = useCallback((landmarks: any[]) => {
    if (!positionVariance) return true

    try {
      const wrist = landmarks[0]
      const currentPosition = { x: wrist.x, y: wrist.y }

      if (!lastHandPosition.current) {
        return true
      }

      const distance = Math.sqrt(
        Math.pow(currentPosition.x - lastHandPosition.current.x, 2) +
        Math.pow(currentPosition.y - lastHandPosition.current.y, 2)
      )

      const threshold = 0.015
      return distance > threshold
    } catch {
      return true
    }
  }, [positionVariance])

  const updateLastHandPosition = useCallback((landmarks: any[]) => {
    try {
      const wrist = landmarks[0]
      lastHandPosition.current = { x: wrist.x, y: wrist.y }
    } catch {}
  }, [])

  const updateCaptureHistory = useCallback((landmarks: any[]) => {
    try {
      const wrist = landmarks[0]
      const position = { x: wrist.x, y: wrist.y }
      const time = Date.now()

      captureHistory.current.push({ position, time })
      captureHistory.current = captureHistory.current.slice(-10)
    } catch {}
  }, [])

  const startBurstCapture = useCallback(() => {
    if (!currentLabel || currentLabelCaptured >= currentLabelConfig.targetSamples) return

    setIsCapturing(true)
    resetPositionMemory()

    let captureCount = 0
    const maxCaptures = Math.min(burstCount, currentLabelConfig.targetSamples - currentLabelCaptured)

    const burstInterval = setInterval(() => {
      handleCapture()
      captureCount++

      if (captureCount >= maxCaptures) {
        clearInterval(burstInterval)
        setIsCapturing(false)
      }
    }, 200)
  }, [currentLabel, currentLabelCaptured, currentLabelConfig, burstCount, handleCapture, resetPositionMemory])

  const startAutoCapture = useCallback(() => {
    if (!currentLabel || currentLabelCaptured >= currentLabelConfig.targetSamples || isAutoCapture) return

    setIsAutoCapture(true)
    resetPositionMemory()

    const captureLoop = () => {
      const currentCapturedCount = capturedSamples[currentLabel] || 0
      if (currentCapturedCount >= currentLabelConfig.targetSamples) {
        stopAutoCapture()
        return
      }
      handleCapture()
    }

    autoCaptureIntervalRef.current = setInterval(captureLoop, captureInterval)
  }, [currentLabel, currentLabelCaptured, currentLabelConfig, capturedSamples, handleCapture, captureInterval, isAutoCapture, resetPositionMemory])

  const stopAutoCapture = useCallback(() => {
    setIsAutoCapture(false)
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current)
      autoCaptureIntervalRef.current = null
    }
  }, [])

  const toggleAutoCapture = () => {
    if (isAutoCapture) {
      stopAutoCapture()
    } else {
      startAutoCapture()
    }
  }

  const resetCurrentLabel = () => {
    stopAutoCapture()
    const filteredData = trainingData.filter(sample => sample.label !== currentLabel)
    setTrainingData(filteredData)
    setCapturedSamples(prev => ({ ...prev, [currentLabel]: 0 }))
    resetPositionMemory()
  }

  const skipToNextLabel = () => {
    stopAutoCapture()
    if (currentLabelIndex + 1 < enabledLabels.length) {
      setCurrentLabelIndex(prev => prev + 1)
      resetPositionMemory()
    }
  }

  const goToPreviousLabel = () => {
    stopAutoCapture()
    if (currentLabelIndex > 0) {
      setCurrentLabelIndex(prev => prev - 1)
      resetPositionMemory()
    }
  }

  const updateTempLabelConfig = (labelIndex: number, field: keyof LabelConfig, value: any) => {
    setTempLabelConfigs(prev => prev.map((config, index) =>
      index === labelIndex ? { ...config, [field]: value } : config
    ))
  }

  const applyGlobalSamples = () => {
    setTempLabelConfigs(prev => prev.map(config => ({
      ...config,
      targetSamples: globalSamples
    })))
  }

  const saveIndividualConfig = () => {
    setLabelConfigs(tempLabelConfigs)
    setShowIndividualConfig(false)
  }

  const cancelIndividualConfig = () => {
    setTempLabelConfigs(labelConfigs)
    setShowIndividualConfig(false)
  }

  const resetAllToDefault = () => {
    setTempLabelConfigs(prev => prev.map(config => ({
      ...config,
      targetSamples: samplesPerLabel,
      enabled: true
    })))
  }

  const getTotalEstimatedTime = () => {
    const totalSamples = tempLabelConfigs.filter(c => c.enabled).reduce((sum, config) => sum + config.targetSamples, 0)
    return Math.ceil(totalSamples / 20)
  }

  const handleTrainModel = () => {
    const enabledData = trainingData.filter(sample =>
      enabledLabels.some(config => config.label === sample.label)
    )
    onTrainingComplete(enabledData)
  }

  const handleCancelTraining = () => {
    if (showTrainingConfirm) {
      setShowTrainingConfirm(false)
    } else {
      stopAutoCapture()
      onCancel()
    }
  }

  const progress = Math.min(currentTotalCaptured / totalTargetSamples, 1)
  const currentLabelProgress = Math.min(currentLabelCaptured / (currentLabelConfig?.targetSamples || 1), 1)

  useEffect(() => {
    const currentCapturedCount = capturedSamples[currentLabel] || 0
    if (currentCapturedCount >= (currentLabelConfig?.targetSamples || 0)) {
      stopAutoCapture()
      setTimeout(() => {
        if (currentLabelIndex + 1 < enabledLabels.length) {
          setCurrentLabelIndex(currentLabelIndex + 1)
          resetPositionMemory()
        } else {
          setShowTrainingConfirm(true)
        }
      }, 500)
    }
  }, [capturedSamples, currentLabel, currentLabelIndex, enabledLabels.length, currentLabelConfig, stopAutoCapture, resetPositionMemory])

  useEffect(() => {
    resetPositionMemory()
  }, [currentLabelIndex, resetPositionMemory])

  useEffect(() => {
    return () => {
      stopAutoCapture()
      if (positionResetTimeout.current) {
        clearTimeout(positionResetTimeout.current)
      }
    }
  }, [stopAutoCapture])

  if (showTrainingConfirm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl mb-6 shadow-lg animate-bounce">
              <Award className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              Captura Completada
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Se han capturado {trainingData.length} muestras en total
            </p>
            <p className="text-gray-500 mb-8">
              Distribución por seña habilitada
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 lg:p-8 mb-8">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center text-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Resumen de captura
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enabledLabels.map((config) => (
                <div key={config.label} className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-medium text-green-900">{config.label}</span>
                  </div>
                  <span className="text-lg font-bold text-green-700">
                    {capturedSamples[config.label] || 0} muestras
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              onClick={handleCancelTraining}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
            >
              Volver a Captura
            </button>
            <button
              onClick={handleTrainModel}
              className="flex items-center justify-center space-x-3 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
            >
              <Sparkles className="h-5 w-5" />
              <span>Entrenar Modelo</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Captura de Muestras
              </h1>
              <p className="text-lg text-gray-600">
                Entrena tu modelo con datos de alta calidad
              </p>
            </div>
           
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Configurar</span>
              </button>
             
              <button
                onClick={() => {
                  setTempLabelConfigs(labelConfigs)
                  setShowIndividualConfig(true)
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Configurar Señas</span>
                <span className="sm:hidden">Señas</span>
              </button>
             
              <div className="bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-sm font-medium text-gray-600">Progreso</div>
                <div className="text-lg font-bold text-blue-600">{Math.round(progress * 100)}%</div>
              </div>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {showSettings && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configuración de Captura
              </h3>
            </div>
           
            <div className="p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Velocidad de Captura: {captureInterval}ms
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="50"
                      value={captureInterval}
                      onChange={(e) => setCaptureInterval(parseInt(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Muy Rápido</span>
                      <span>Lento</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Modo Ráfaga: {burstCount} capturas
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="10"
                      step="1"
                      value={burstCount}
                      onChange={(e) => setBurstCount(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                      disabled={!burstMode}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>3</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center space-x-3 p-4 bg-blue-50 rounded-2xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={positionVariance}
                      onChange={(e) => {
                        setPositionVariance(e.target.checked)
                        if (!e.target.checked) {
                          resetPositionMemory()
                        }
                      }}
                      className="rounded accent-blue-500"
                    />
                    <div>
                      <span className="font-medium text-blue-900">Variación de posición</span>
                      <p className="text-sm text-blue-700">Captura solo con movimiento de mano</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 bg-green-50 rounded-2xl border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={qualityFilter}
                      onChange={(e) => setQualityFilter(e.target.checked)}
                      className="rounded accent-green-500"
                    />
                    <div>
                      <span className="font-medium text-green-900">Filtro de calidad</span>
                      <p className="text-sm text-green-700">Filtra automáticamente muestras de baja calidad</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 bg-purple-50 rounded-2xl border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={burstMode}
                      onChange={(e) => setBurstMode(e.target.checked)}
                      className="rounded accent-purple-500"
                    />
                    <div>
                      <span className="font-medium text-purple-900">Modo ráfaga</span>
                      <p className="text-sm text-purple-700">Captura múltiples muestras rápidamente</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {showIndividualConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
                <div className="flex items-center space-x-3">
                  <Settings className="h-6 w-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Configuración por Seña</h3>
                </div>
                <button
                  onClick={cancelIndividualConfig}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="mb-8 bg-gray-50 rounded-2xl p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900">Configuración Global</h4>
                    <button
                      onClick={resetAllToDefault}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      <RotateCw className="h-4 w-4" />
                      <span>Restaurar Predeterminado</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Muestras para todas las señas: {globalSamples}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="500"
                        step="1"
                        value={globalSamples}
                        onChange={(e) => setGlobalSamples(parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1</span>
                        <span>500</span>
                      </div>
                    </div>
                    <button
                      onClick={applyGlobalSamples}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Aplicar a Todas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tempLabelConfigs.map((config, index) => (
                    <div key={config.label} className={`border-2 rounded-2xl p-6 transition-all ${
                      config.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-6">
                        <h5 className="text-lg font-bold text-gray-900">{config.label}</h5>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => updateTempLabelConfig(index, 'enabled', e.target.checked)}
                            className="rounded accent-blue-500"
                          />
                          <span className="text-sm font-medium">Habilitada</span>
                        </label>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de muestras: {config.targetSamples}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="500"
                            step="1"
                            value={config.targetSamples}
                            onChange={(e) => updateTempLabelConfig(index, 'targetSamples', parseInt(e.target.value))}
                            disabled={!config.enabled}
                            className="w-full accent-blue-500"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1</span>
                            <span>500</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateTempLabelConfig(index, 'targetSamples', Math.max(1, config.targetSamples - 5))}
                              className="p-2 hover:bg-white rounded-xl transition-colors"
                              disabled={!config.enabled}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="9999"
                              value={config.targetSamples}
                              onChange={(e) => updateTempLabelConfig(index, 'targetSamples', Math.max(1, parseInt(e.target.value) || 1))}
                              disabled={!config.enabled}
                              className="w-20 px-3 py-2 bg-white rounded-xl text-center border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => updateTempLabelConfig(index, 'targetSamples', config.targetSamples + 5)}
                              className="p-2 hover:bg-white rounded-xl transition-colors"
                              disabled={!config.enabled}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-sm text-gray-600 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>~{Math.ceil(config.targetSamples / 20)} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Resumen de Configuración
                  </h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-3 bg-white rounded-xl">
                      <span className="block text-blue-700 font-medium">Señas habilitadas</span>
                      <div className="text-xl font-bold text-blue-900 mt-1">{tempLabelConfigs.filter(c => c.enabled).length}</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-xl">
                      <span className="block text-blue-700 font-medium">Total muestras</span>
                      <div className="text-xl font-bold text-blue-900 mt-1">{tempLabelConfigs.filter(c => c.enabled).reduce((sum, config) => sum + config.targetSamples, 0)}</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-xl">
                      <span className="block text-blue-700 font-medium">Tiempo estimado</span>
                      <div className="text-xl font-bold text-blue-900 mt-1">~{getTotalEstimatedTime()} min</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-xl">
                      <span className="block text-blue-700 font-medium">Promedio por seña</span>
                      <div className="text-xl font-bold text-blue-900 mt-1">{Math.round(tempLabelConfigs.filter(c => c.enabled).reduce((sum, config) => sum + config.targetSamples, 0) / Math.max(tempLabelConfigs.filter(c => c.enabled).length, 1))}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-6 border-t bg-gray-50">
                <button
                  onClick={cancelIndividualConfig}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-100 hover:border-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveIndividualConfig}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-semibold"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar Configuración</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Seña Actual: {currentLabel}
                  </h3>
                  {!currentLabelConfig?.enabled && (
                    <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full">Deshabilitada</span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{currentLabelCaptured}</div>
                    <div className="text-sm text-gray-600">de {currentLabelConfig?.targetSamples || 0} muestras</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={goToPreviousLabel}
                      disabled={currentLabelIndex === 0}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={skipToNextLabel}
                      disabled={currentLabelIndex >= enabledLabels.length - 1}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${currentLabelProgress * 100}%` }}
                  />
                </div>

                {currentLabelConfig?.enabled ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {burstMode ? (
                        <button
                          onClick={startBurstCapture}
                          disabled={isCapturing || isAutoCapture || currentLabelCaptured >= currentLabelConfig.targetSamples}
                          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg font-medium"
                        >
                          <Zap className="h-4 w-4" />
                          <span>{isCapturing ? 'Capturando Ráfaga...' : `Capturar ${burstCount} Muestras`}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setIsCapturing(true)
                            resetPositionMemory()
                            handleCapture()
                            setTimeout(() => setIsCapturing(false), 200)
                          }}
                          disabled={isCapturing || isAutoCapture || currentLabelCaptured >= currentLabelConfig.targetSamples}
                          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg font-medium"
                        >
                          <Camera className="h-4 w-4" />
                          <span>{isCapturing ? 'Capturando...' : 'Capturar Una'}</span>
                        </button>
                      )}

                      <button
                        onClick={toggleAutoCapture}
                        disabled={isCapturing || currentLabelCaptured >= currentLabelConfig.targetSamples}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl font-medium transition-all shadow-lg ${
                          isAutoCapture
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                            : currentLabelCaptured >= currentLabelConfig.targetSamples
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                        }`}
                      >
                        {isAutoCapture ? (
                          <>
                            <PauseIcon className="h-4 w-4" />
                            <span>Detener Auto</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Auto Captura</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={resetCurrentLabel}
                        disabled={isAutoCapture}
                        className="flex items-center justify-center space-x-2 px-4 py-2 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 font-medium"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Reiniciar "{currentLabel}"</span>
                      </button>

                      {allLabelsCompleted && !showTrainingConfirm && (
                        <button
                          onClick={() => setShowTrainingConfirm(true)}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-medium"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Finalizar Captura</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <X className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">Esta seña está deshabilitada</p>
                    <button
                      onClick={() => {
                        const updatedConfigs = labelConfigs.map((config, idx) =>
                          idx === currentLabelIndex ? { ...config, enabled: true } : config
                        )
                        setLabelConfigs(updatedConfigs)
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-medium"
                    >
                      Habilitar Seña
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Vista de Cámara
                </h3>
              </div>
             
              <div className="p-6">
                <CameraCapture
                  ref={cameraRef}
                  className="h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden"
                />
                {(isCapturing || isAutoCapture) && (
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-2xl border border-green-200">
                      <div className="w-3 h-3 bg-green-600 rounded-full mr-3 animate-pulse" />
                      <span className="font-medium">
                        {isAutoCapture ? `Captura automática: ${currentLabelCaptured}/${currentLabelConfig?.targetSamples}` : 'Capturando...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                <h4 className="text-xl font-bold text-white flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Progreso por Seña
                </h4>
              </div>
             
              <div className="p-6">
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {enabledLabels.map((config, index) => {
                    const completed = capturedSamples[config.label] || 0
                    const isCurrentLabel = index === currentLabelIndex
                    const completionPercentage = Math.min((completed / config.targetSamples) * 100, 100)
                    const isLabelComplete = completed >= config.targetSamples

                    return (
                      <div key={config.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {isLabelComplete ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className={`h-5 w-5 ${isCurrentLabel ? 'text-blue-500' : 'text-gray-300'}`} />
                            )}
                            <span className={`text-sm font-medium ${isCurrentLabel ? 'text-blue-600' : 'text-gray-600'}`}>
                              {config.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {completed}/{config.targetSamples}
                            {completed > config.targetSamples ? ` (+${completed - config.targetSamples})` : ''}
                          </span>
                        </div>
                       
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isLabelComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              isCurrentLabel ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {isAutoCapture && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Captura Automática Activa
                </h4>
                <div className="space-y-3 text-sm text-green-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <span>Capturando cada {captureInterval}ms</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <span>Mantén la seña estable y clara</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <span>{positionVariance ? 'Mueve la mano para variar posiciones' : 'La mano puede estar estática'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <span>Se detendrá al completar {currentLabelConfig?.targetSamples} muestras</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Consejos de Captura
              </h4>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                  <span>Captura rápida: {captureInterval < 200 ? 'Activa' : 'Inactiva'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                  <span>{positionVariance ? 'Requiere movimiento de mano' : 'Acepta mano estática'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                  <span>Mantén buena iluminación</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                  <span>Evita movimientos muy rápidos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                  <span>{qualityFilter ? 'Filtro de calidad básico activo' : 'Sin filtro de calidad'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                  <span>La mano puede estar cerca o lejos de la cámara</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <h4 className="font-semibold text-amber-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Resumen del Entrenamiento
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Señas definidas:</span>
                  <span className="font-bold text-amber-900">{enabledLabels.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Muestras totales:</span>
                  <span className="font-bold text-amber-900">{totalTargetSamples}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Ya capturadas:</span>
                  <span className="font-bold text-amber-900">{currentTotalCaptured}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Tiempo estimado:</span>
                  <span className="font-bold text-amber-900">~{Math.ceil(totalTargetSamples / 20)} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleCancelTraining}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-2xl transition-colors font-medium"
          >
            Cancelar Captura
          </button>
        </div>
      </div>
    </div>
  )
}