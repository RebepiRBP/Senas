import { useState, useRef, useCallback, useEffect } from 'react'
import { Calculator, RotateCcw, Volume2, VolumeX, Settings, History, Activity, Target, TrendingUp, Clock, Eye, BarChart3, Zap } from 'lucide-react'
import CameraCapture, { CameraCaptureHandle } from './CameraCapture'
import SpeechControls from './SpeechControls'
import { api } from '@/services/api'
import { ArithmeticState, ArithmeticOperation } from '@/types'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

interface ArithmeticModeProps {
  modelId: string
  modelName: string
}

export default function ArithmeticMode({ modelId, modelName }: ArithmeticModeProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.95)
  const [detectionInterval, setDetectionInterval] = useState(300)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [arithmeticState, setArithmeticState] = useState<ArithmeticState>({
    buffer: '',
    tokens: [],
    lastDetection: null,
    lastDetectionTime: 0,
    operations: [],
    currentResult: null
  })

  const [gestureState, setGestureState] = useState<{
    currentGesture: string | null
    gestureStartTime: number
    handPresent: boolean
    cooldownActive: boolean
    stableFrameCount: number
    requiredStableFrames: number
  }>({
    currentGesture: null,
    gestureStartTime: 0,
    handPresent: false,
    cooldownActive: false,
    stableFrameCount: 0,
    requiredStableFrames: 8
  })

  const [sessionStats, setSessionStats] = useState({
    totalGestures: 0,
    correctGestures: 0,
    operationsCompleted: 0,
    sessionTime: 0
  })

  const cameraRef = useRef<CameraCaptureHandle>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionStartTime = useRef<number>(Date.now())

  const DEBOUNCE_TIME = 1500
  const MIN_GESTURE_DURATION = 800
  const COOLDOWN_DURATION = 1200
  const HAND_ABSENCE_THRESHOLD = 1000

  const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  const OPERATORS = ['+', '-', 'x', '/']

  const { speakArithmetic } = useSpeechSynthesis()

  const evaluateExpression = useCallback((tokens: string[]): number | null => {
    try {
      if (tokens.length === 0) return null

      const processedTokens = [...tokens]
      let result = parseFloat(processedTokens[0])

      if (isNaN(result)) return null

      for (let i = 1; i < processedTokens.length; i += 2) {
        const operator = processedTokens[i]
        const operand = parseFloat(processedTokens[i + 1])

        if (isNaN(operand)) break

        switch (operator) {
          case '+':
            result += operand
            break
          case '-':
            result -= operand
            break
          case 'x':
            result *= operand
            break
          case '/':
            if (operand === 0) return null
            result /= operand
            break
          default:
            return null
        }
      }

      return Math.round(result * 10000) / 10000
    } catch {
      return null
    }
  }, [])

  const processStableGesture = useCallback((prediction: string) => {
    if (NUMBERS.includes(prediction)) {
      setArithmeticState(prev => ({
        ...prev,
        buffer: prev.buffer + prediction,
        lastDetection: prediction,
        lastDetectionTime: Date.now()
      }))

      setSessionStats(prev => ({
        ...prev,
        totalGestures: prev.totalGestures + 1,
        correctGestures: prev.correctGestures + 1
      }))

      if (soundEnabled) {
        speakArithmetic({
          numbers: [prediction],
          operators: []
        })
      }
    } else if (prediction === 'espacio') {
      setArithmeticState(prev => {
        if (prev.buffer.length > 0) {
          return {
            ...prev,
            tokens: [...prev.tokens, prev.buffer],
            buffer: '',
            lastDetection: prediction,
            lastDetectionTime: Date.now()
          }
        }
        return prev
      })
    } else if (OPERATORS.includes(prediction)) {
      setArithmeticState(prev => {
        const newTokens = prev.buffer.length > 0
          ? [...prev.tokens, prev.buffer, prediction]
          : [...prev.tokens, prediction]

        return {
          ...prev,
          tokens: newTokens,
          buffer: '',
          lastDetection: prediction,
          lastDetectionTime: Date.now()
        }
      })

      if (soundEnabled) {
        speakArithmetic({
          numbers: [],
          operators: [prediction]
        })
      }
    } else if (prediction === 'enter') {
      setArithmeticState(prev => {
        const finalTokens = prev.buffer.length > 0
          ? [...prev.tokens, prev.buffer]
          : prev.tokens

        const result = evaluateExpression(finalTokens)

        if (result !== null) {
          const operation: ArithmeticOperation = {
            id: Date.now().toString(),
            expression: [...finalTokens],
            result,
            timestamp: new Date().toISOString()
          }

          setSessionStats(prevStats => ({
            ...prevStats,
            operationsCompleted: prevStats.operationsCompleted + 1
          }))

          if (soundEnabled) {
            const numbers: string[] = []
            const operators: string[] = []

            for (let i = 0; i < finalTokens.length; i += 2) {
              numbers.push(finalTokens[i])
              if (i + 1 < finalTokens.length) {
                operators.push(finalTokens[i + 1])
              }
            }

            speakArithmetic({
              numbers,
              operators,
              result
            })
          }

          return {
            ...prev,
            operations: [operation, ...prev.operations.slice(0, 9)],
            currentResult: result,
            tokens: [],
            buffer: '',
            lastDetection: prediction,
            lastDetectionTime: Date.now()
          }
        }

        return prev
      })
    }
  }, [evaluateExpression, soundEnabled, speakArithmetic])

  const processDetection = useCallback(async (prediction: string, confidence: number, hasHand: boolean) => {
    const now = Date.now()

    if (!hasHand) {
      if (gestureState.handPresent && now - gestureState.gestureStartTime > HAND_ABSENCE_THRESHOLD) {
        setGestureState(prev => ({
          ...prev,
          handPresent: false,
          currentGesture: null,
          stableFrameCount: 0,
          cooldownActive: false
        }))
      }
      return
    }

    if (confidence < confidenceThreshold) return

    const validGestures = [...NUMBERS, ...OPERATORS, 'espacio', 'enter']
    if (!validGestures.includes(prediction)) return

    setGestureState(prev => {
      const newState = { ...prev, handPresent: true }

      if (prev.cooldownActive) {
        if (now - prev.gestureStartTime > COOLDOWN_DURATION) {
          newState.cooldownActive = false
        } else {
          return newState
        }
      }

      if (prev.currentGesture === prediction) {
        newState.stableFrameCount = prev.stableFrameCount + 1

        if (newState.stableFrameCount >= prev.requiredStableFrames &&
          !prev.cooldownActive &&
          now - prev.gestureStartTime > MIN_GESTURE_DURATION) {
          processStableGesture(prediction)
          newState.cooldownActive = true
          newState.gestureStartTime = now
          newState.stableFrameCount = 0
        }
      } else {
        newState.currentGesture = prediction
        newState.stableFrameCount = 1
        newState.gestureStartTime = now
      }

      return newState
    })
  }, [confidenceThreshold, gestureState, processStableGesture])

  const performDetection = useCallback(async () => {
    if (!cameraRef.current) return

    const snapshot = cameraRef.current.takeSnapshot()

    if (!snapshot) {
      processDetection('', 0, false)
      return
    }

    const hasHand = snapshot.landmarks && snapshot.landmarks.length > 0

    if (!hasHand) {
      processDetection('', 0, false)
      return
    }

    try {
      setError(null)
      const response = await api.post(`/models/${modelId}/predict`, {
        landmarks: snapshot.landmarks[0]
      })

      const { prediction, confidence } = response.data
      processDetection(prediction, confidence, true)
    } catch (err: any) {
      console.error('Detection error:', err)
      setError('Error en la detección: ' + (err.response?.data?.detail || err.message))
    }
  }, [modelId, processDetection])

  const startDetection = useCallback(() => {
    if (isDetecting) return

    setIsDetecting(true)
    setError(null)
    sessionStartTime.current = Date.now()
    
    setGestureState(prev => ({
      ...prev,
      currentGesture: null,
      stableFrameCount: 0,
      cooldownActive: false,
      handPresent: false
    }))

    setSessionStats({
      totalGestures: 0,
      correctGestures: 0,
      operationsCompleted: 0,
      sessionTime: 0
    })

    detectionIntervalRef.current = setInterval(performDetection, detectionInterval)
  }, [isDetecting, performDetection, detectionInterval])

  const stopDetection = useCallback(() => {
    setIsDetecting(false)
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
    
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current)
      gestureTimeoutRef.current = null
    }

    setGestureState(prev => ({
      ...prev,
      currentGesture: null,
      stableFrameCount: 0,
      cooldownActive: false,
      handPresent: false
    }))
  }, [])

  const clearAll = useCallback(() => {
    setArithmeticState({
      buffer: '',
      tokens: [],
      lastDetection: null,
      lastDetectionTime: 0,
      operations: [],
      currentResult: null
    })

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }

    setGestureState(prev => ({
      ...prev,
      currentGesture: null,
      stableFrameCount: 0,
      cooldownActive: false
    }))

    setSessionStats({
      totalGestures: 0,
      correctGestures: 0,
      operationsCompleted: 0,
      sessionTime: 0
    })
  }, [])

  const clearCurrent = useCallback(() => {
    setArithmeticState(prev => ({
      ...prev,
      buffer: '',
      tokens: [],
      currentResult: null
    }))
  }, [])

  const formatExpression = (tokens: string[], buffer: string = '') => {
    const allTokens = [...tokens]
    if (buffer) allTokens.push(buffer)
    return allTokens.join(' ') || '0'
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const successRate = sessionStats.totalGestures > 0 
    ? Math.round((sessionStats.correctGestures / sessionStats.totalGestures) * 100) 
    : 0

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isDetecting) {
      interval = setInterval(() => {
        setSessionStats(prev => ({
          ...prev,
          sessionTime: Math.floor((Date.now() - sessionStartTime.current) / 1000)
        }))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isDetecting])

  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  return (
    <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
      <div className="text-center mb-8 lg:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl mb-6 shadow-lg">
          <Calculator className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
          Calculadora Aritmética
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-blue-600">{sessionStats.totalGestures}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Gestos</p>
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
            <div className="p-2 bg-orange-100 rounded-xl">
              <Calculator className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-orange-600">{sessionStats.operationsCompleted}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Operaciones</p>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-purple-600">
              {formatTime(sessionStats.sessionTime)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Tiempo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Vista de Cámara
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <SpeechControls mode="arithmetic" />
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                    title="Historial"
                  >
                    <History className="h-5 w-5" />
                  </button>
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
                      <Calculator className="h-4 w-4" />
                      <span className="hidden sm:inline">Iniciar</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopDetection}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="hidden sm:inline">Detener</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <CameraCapture
                ref={cameraRef}
                showLandmarks={true}
                className="h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden"
              />

              {isDetecting && gestureState.handPresent && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        gestureState.cooldownActive ? 'bg-orange-400' :
                        gestureState.currentGesture ? 'bg-green-400' : 'bg-blue-400'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {gestureState.cooldownActive ? 'Procesado' :
                        gestureState.currentGesture ? `Detectando: ${gestureState.currentGesture}` :
                        'Esperando gesto'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Estabilidad: {gestureState.stableFrameCount}/{gestureState.requiredStableFrames}
                    </div>
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
                    min="0.8"
                    max="0.99"
                    step="0.01"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-orange-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>80%</span>
                    <span>99%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo de Detección: {detectionInterval}ms
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="1000"
                    step="50"
                    value={detectionInterval}
                    onChange={(e) => setDetectionInterval(parseInt(e.target.value))}
                    className="w-full accent-orange-600"
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
                    className="rounded accent-orange-600"
                  />
                  <span className="text-sm">Habilitar síntesis de voz</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Calculadora
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-900 text-white p-6 rounded-2xl">
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-2">Operación:</div>
                  <div className="text-2xl lg:text-3xl font-mono mb-2">
                    {formatExpression(arithmeticState.tokens, arithmeticState.buffer)}
                    {arithmeticState.buffer && <span className="text-yellow-400">_</span>}
                  </div>
                  {arithmeticState.currentResult !== null && (
                    <>
                      <div className="text-sm text-gray-400 mt-4 mb-2">Resultado:</div>
                      <div className="text-3xl lg:text-4xl font-bold text-green-400">
                        = {arithmeticState.currentResult}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={clearCurrent}
                  className="px-4 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors font-medium"
                >
                  Limpiar
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  Reset Todo
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Señas Reconocidas</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-gray-900">Números:</strong>
                  <div className="text-gray-600 mt-1">0, 1, 2, 3, 4, 5, 6, 7, 8, 9</div>
                </div>
                <div>
                  <strong className="text-gray-900">Operadores:</strong>
                  <div className="text-gray-600 mt-1">+, -, x, /</div>
                </div>
                <div>
                  <strong className="text-gray-900">Espacio:</strong>
                  <div className="text-gray-600 mt-1">Separar números</div>
                </div>
                <div>
                  <strong className="text-gray-900">Enter:</strong>
                  <div className="text-gray-600 mt-1">Calcular resultado</div>
                </div>
              </div>
            </div>
          </div>

          {showHistory && arithmeticState.operations.length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Historial
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {arithmeticState.operations.map((operation, index) => (
                    <div
                      key={operation.id}
                      className={`p-4 rounded-xl border transition-all ${
                        index === 0 ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="font-mono text-sm mb-1">
                        {operation.expression.join(' ')} = {operation.result}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(operation.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Instrucciones Mejoradas
            </h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Haz la seña claramente y mantén por 1 segundo</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Retira la mano después de cada detección</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Espera la confirmación visual antes del siguiente gesto</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Usa "espacio" para separar números grandes</span>
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                <span>Usa "enter" para calcular el resultado final</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
            <h4 className="font-medium text-green-900 mb-3 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Estado del Sistema
            </h4>
            <div className="text-sm text-green-800 space-y-2">
              <div className="flex justify-between">
                <span>Mano presente:</span>
                <span className="font-medium">{gestureState.handPresent ? 'Sí' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Gesto actual:</span>
                <span className="font-medium">{gestureState.currentGesture || 'Ninguno'}</span>
              </div>
              <div className="flex justify-between">
                <span>En pausa:</span>
                <span className="font-medium">{gestureState.cooldownActive ? 'Sí' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Frames estables:</span>
                <span className="font-medium">{gestureState.stableFrameCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}