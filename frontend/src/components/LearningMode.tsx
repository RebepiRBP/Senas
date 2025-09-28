import { useState, useEffect } from 'react'
import { BookOpen, Target, Play, Pause, Award, CheckCircle2, X, ChevronLeft, ChevronRight, Star, TrendingUp, Clock, Zap, Activity } from 'lucide-react'
import ReferenceImage from './ReferenceImage'
import EnhancedPracticeComparison from './EnhancedPracticeComparison'
import { api } from '@/services/api'

interface LearningModeProps {
  modelId: string
  modelName: string
}

interface LearningData {
  label: string
  referenceImage: string
  totalSamples: number
}

interface PracticeStats {
  totalAttempts: number
  correctAttempts: number
  averageConfidence: number
  streak: number
  maxStreak: number
  sessionTime: number
}

export default function LearningMode({ modelId, modelName }: LearningModeProps) {
  const [learningData, setLearningData] = useState<LearningData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [practiceStats, setPracticeStats] = useState<PracticeStats>({
    totalAttempts: 0,
    correctAttempts: 0,
    averageConfidence: 0,
    streak: 0,
    maxStreak: 0,
    sessionTime: 0
  })
  const [showCongratulations, setShowCongratulations] = useState(false)
  const [showStats, setShowStats] = useState(true)

  useEffect(() => {
    const fetchLearningData = async () => {
      try {
        const response = await api.get(`/learning/${modelId}/references`)
        setLearningData(response.data)
      } catch (err: any) {
        setError('Error al cargar datos de aprendizaje')
      } finally {
        setLoading(false)
      }
    }

    fetchLearningData()
  }, [modelId])

  const currentData = learningData[currentIndex]

  const nextSign = () => {
    if (currentIndex < learningData.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      checkForCompletion()
    }
  }

  const prevSign = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const updateStats = (isCorrect: boolean, confidence: number) => {
    setPracticeStats(prev => {
      const newTotal = prev.totalAttempts + 1
      const newCorrect = isCorrect ? prev.correctAttempts + 1 : prev.correctAttempts
      const newStreak = isCorrect ? prev.streak + 1 : 0
      const newMaxStreak = Math.max(prev.maxStreak, newStreak)
      const newAvgConfidence = (prev.averageConfidence * prev.totalAttempts + confidence) / newTotal

      return {
        totalAttempts: newTotal,
        correctAttempts: newCorrect,
        averageConfidence: newAvgConfidence,
        streak: newStreak,
        maxStreak: newMaxStreak,
        sessionTime: prev.sessionTime + 1
      }
    })
  }

  const checkForCompletion = () => {
    if (practiceStats.correctAttempts >= learningData.length * 2) {
      setShowCongratulations(true)
    }
  }

  const getSuccessRate = () => {
    return practiceStats.totalAttempts > 0
      ? Math.round((practiceStats.correctAttempts / practiceStats.totalAttempts) * 100)
      : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg animate-pulse">Cargando experiencia de aprendizaje...</p>
        </div>
      </div>
    )
  }

  if (error || learningData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center py-12 max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-red-100 to-red-200 rounded-3xl flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No hay datos de aprendizaje</h2>
          <p className="text-gray-600 leading-relaxed">Este modelo no tiene imágenes de referencia disponibles para practicar</p>
        </div>
      </div>
    )
  }

  if (showCongratulations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12">
            <div className="relative mb-8">
              <Award className="h-24 w-24 text-yellow-500 mx-auto animate-bounce" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-white" fill="currentColor" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-4">
              ¡Felicitaciones!
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Has completado exitosamente la sesión de aprendizaje
            </p>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{getSuccessRate()}%</div>
                <div className="text-sm text-green-800">Tasa de éxito</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{practiceStats.totalAttempts}</div>
                <div className="text-sm text-blue-800">Intentos totales</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{practiceStats.maxStreak}</div>
                <div className="text-sm text-purple-800">Mejor racha</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{Math.round(practiceStats.averageConfidence * 100)}%</div>
                <div className="text-sm text-orange-800">Confianza promedio</div>
              </div>
            </div>

            <button
              onClick={() => window.history.back()}
              className="btn-primary text-lg px-8 py-4"
            >
              Finalizar Sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Modo Aprendizaje
            </h1>
            <p className="text-gray-600">Modelo: {modelName}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-full hover:bg-white transition-colors lg:hidden"
            >
              {showStats ? <X className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
            </button>
            
            <div className="flex items-center bg-white rounded-2xl px-4 py-2 shadow-sm border border-gray-100">
              <div className="text-center mr-4">
                <div className="text-xl font-bold text-blue-600">{currentIndex + 1}</div>
                <div className="text-xs text-gray-500">de {learningData.length}</div>
              </div>
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / learningData.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-bold text-gray-900">{practiceStats.totalAttempts}</span>
              </div>
              <p className="text-sm text-gray-600">Intentos</p>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-lg font-bold text-green-600">{practiceStats.correctAttempts}</span>
              </div>
              <p className="text-sm text-gray-600">Correctos</p>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="text-lg font-bold text-purple-600">{getSuccessRate()}%</span>
              </div>
              <p className="text-sm text-gray-600">Éxito</p>
            </div>
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-hover">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <span className="text-lg font-bold text-orange-600">{practiceStats.streak}</span>
              </div>
              <p className="text-sm text-gray-600">Racha</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Seña: {currentData?.label}
              </h3>
            </div>
            <div className="p-6">
              <ReferenceImage
                imageData={currentData?.referenceImage}
                label={currentData?.label}
                showControls={false}
                className="rounded-2xl overflow-hidden"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Tu Práctica
                </h3>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    isActive 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                      : 'bg-white hover:bg-gray-50 text-green-600 shadow-md'
                  }`}
                >
                  {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span className="text-sm">{isActive ? 'Detener' : 'Iniciar'}</span>
                </button>
              </div>
            </div>
            <EnhancedPracticeComparison
              modelId={modelId}
              targetLabel={currentData?.label}
              isActive={isActive}
              onStatsUpdate={updateStats}
              onNextLabel={nextSign}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={prevSign}
              disabled={currentIndex === 0}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all ${
                currentIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium">Anterior</span>
            </button>

            <div className="text-center flex-1 max-w-md">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-2xl font-bold mb-2">
                {currentData?.label}
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Seña {currentIndex + 1} de {learningData.length}</span>
              </div>
            </div>

            <button
              onClick={nextSign}
              disabled={currentIndex >= learningData.length - 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all ${
                currentIndex >= learningData.length - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              <span className="font-medium">Siguiente</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}