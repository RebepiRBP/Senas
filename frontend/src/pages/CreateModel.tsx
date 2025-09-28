import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Save, Settings, Calculator, Sparkles, Zap, Target, Clock, CheckCircle2 } from 'lucide-react'
import TrainingFlow from '@/components/TrainingFlow'
import { api } from '@/services/api'
import { TrainingData } from '@/types'
import { MODEL_CATEGORIES } from '@/utils/constants'

interface ModelForm {
  name: string
  description: string
  categories: string[]
  labels: string[]
  samplesPerLabel: number
  type: 'standard' | 'arithmetic'
}

interface PresetConfig {
  name: string
  description: string
  categories: string[]
  labels: string[]
  type: 'standard' | 'arithmetic'
  icon: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number
}

export default function CreateModel() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'training' | 'processing'>('form')
  const [form, setForm] = useState<ModelForm>({
    name: '',
    description: '',
    categories: [],
    labels: [],
    samplesPerLabel: 25,
    type: 'standard'
  })
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentPreset, setCurrentPreset] = useState<string | null>(null)

  const presets: Record<string, PresetConfig> = {
    vocales: {
      name: 'Reconocimiento de Vocales',
      description: 'Ideal para comenzar con las cinco vocales básicas',
      categories: ['alfabeto'],
      labels: ['A', 'E', 'I', 'O', 'U'],
      type: 'standard',
      icon: '🔤',
      difficulty: 'beginner',
      estimatedTime: 8
    },
    numeros_basicos: {
      name: 'Números Básicos (1-10)',
      description: 'Reconocimiento de números del 1 al 10',
      categories: ['números'],
      labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      type: 'standard',
      icon: '🔢',
      difficulty: 'beginner',
      estimatedTime: 15
    },
    operaciones: {
      name: 'Operaciones Matemáticas',
      description: 'Símbolos básicos para matemáticas',
      categories: ['operaciones'],
      labels: ['+', '-', '×', '÷', '='],
      type: 'standard',
      icon: '➕',
      difficulty: 'intermediate',
      estimatedTime: 8
    },
    alfabeto_completo: {
      name: 'Alfabeto Completo',
      description: 'Todas las letras del alfabeto',
      categories: ['alfabeto'],
      labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
      type: 'standard',
      icon: '🔠',
      difficulty: 'advanced',
      estimatedTime: 45
    },
    saludos: {
      name: 'Saludos Básicos',
      description: 'Señas de cortesía y saludos',
      categories: ['personalizado'],
      labels: ['Hola', 'Adiós', 'Gracias', 'Por favor', 'Perdón'],
      type: 'standard',
      icon: '👋',
      difficulty: 'beginner',
      estimatedTime: 8
    },
    aritmetica: {
      name: 'Calculadora Aritmética',
      description: 'Modelo especializado para operaciones matemáticas',
      categories: ['operaciones'],
      labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', 'x', '/', 'espacio', 'enter'],
      type: 'arithmetic',
      icon: '🧮',
      difficulty: 'advanced',
      estimatedTime: 25
    }
  }

  const handleInputChange = (field: keyof ModelForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (type: 'standard' | 'arithmetic') => {
    setForm(prev => {
      const updated = { ...prev, type }
      if (type === 'arithmetic') {
        updated.labels = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', 'x', '/', 'espacio', 'enter']
        updated.categories = ['operaciones']
        updated.description = 'Modelo aritmético para operaciones matemáticas básicas'
      }
      return updated
    })
  }

  const handleCategoryToggle = (category: string) => {
    if (form.type === 'arithmetic') return

    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  const addLabel = () => {
    if (form.type === 'arithmetic') return

    if (newLabel.trim() && !form.labels.includes(newLabel.trim())) {
      setForm(prev => ({
        ...prev,
        labels: [...prev.labels, newLabel.trim()]
      }))
      setNewLabel('')
    }
  }

  const removeLabel = (labelToRemove: string) => {
    if (form.type === 'arithmetic') return

    setForm(prev => ({
      ...prev,
      labels: prev.labels.filter(label => label !== labelToRemove)
    }))
  }

  const startTraining = () => {
    if (!form.name.trim() || form.labels.length === 0) {
      setError('Por favor completa el nombre del modelo y añade al menos una seña.')
      return
    }

    if (form.labels.length < 2) {
      setError('Necesitas al menos 2 señas diferentes para entrenar un modelo.')
      return
    }

    setError(null)
    setStep('training')
  }

  const handleTrainingComplete = async (trainingData: TrainingData[]) => {
    setStep('processing')
   
    try {
      const modelData = {
        name: form.name,
        description: form.description,
        categories: form.categories,
        labels: form.labels,
        trainingData,
        type: form.type
      }

      const response = await api.post('/models/create', modelData)
     
      if (response.data.success) {
        navigate('/', {
          state: {
            message: `Modelo "${form.name}" creado exitosamente`
          }
        })
      }
    } catch (err: any) {
      setError('Error al crear el modelo: ' + (err.response?.data?.detail || err.message))
      setStep('training')
    }
  }

  const handleCancel = () => {
    if (step === 'training') {
      setStep('form')
    } else {
      navigate('/')
    }
  }

  const loadPreset = (presetKey: string) => {
    const preset = presets[presetKey]
    if (preset) {
      setForm(prev => ({
        ...prev,
        name: preset.name,
        description: preset.description,
        categories: preset.categories,
        labels: preset.labels,
        type: preset.type
      }))
      setCurrentPreset(presetKey)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Principiante'
      case 'intermediate': return 'Intermedio'
      case 'advanced': return 'Avanzado'
      default: return 'Sin definir'
    }
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-spin opacity-20"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Entrenando tu Modelo</h2>
            <p className="text-gray-600 mb-6">Estamos procesando tus datos y entrenando la inteligencia artificial</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">Validando datos de entrenamiento</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Preparando características de las manos</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-500">Entrenando red neuronal</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-500">Validando precisión del modelo</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-500">Guardando modelo entrenado</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm text-center">
              Este proceso puede tomar varios minutos dependiendo del tamaño de tu modelo
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'training') {
    return (
      <TrainingFlow
        labels={form.labels}
        samplesPerLabel={form.samplesPerLabel}
        onTrainingComplete={handleTrainingComplete}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al inicio</span>
          </button>
         
          <div className="text-center lg:text-left">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Crear Nuevo Modelo
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0">
              Diseña tu modelo de reconocimiento de señas personalizado paso a paso
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Configuración del Modelo
                </h2>
              </div>
             
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tipo de Modelo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleTypeChange('standard')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        form.type === 'standard'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <Target className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-semibold">Estándar</span>
                      </div>
                      <p className="text-sm text-gray-600">Para señas generales y personalizadas</p>
                    </button>
                    <button
                      onClick={() => handleTypeChange('arithmetic')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        form.type === 'arithmetic'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <Calculator className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="font-semibold">Aritmético</span>
                      </div>
                      <p className="text-sm text-gray-600">Para operaciones matemáticas</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Modelo
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Reconocimiento de Vocales"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={form.type === 'arithmetic'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe brevemente qué reconoce este modelo..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    disabled={form.type === 'arithmetic'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Categorías
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MODEL_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategoryToggle(category)}
                        disabled={form.type === 'arithmetic'}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          form.categories.includes(category)
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } ${form.type === 'arithmetic' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Configuración Avanzada
                    </label>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {showAdvanced ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  {showAdvanced && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Muestras por Seña: {form.samplesPerLabel}
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={form.samplesPerLabel}
                          onChange={(e) => handleInputChange('samplesPerLabel', parseInt(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Rápido (10)</span>
                          <span>Balanceado (25)</span>
                          <span>Preciso (100)</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 bg-white rounded-lg p-3">
                        <p><strong>Recomendación:</strong> 25-35 muestras ofrecen el mejor balance entre velocidad y precisión.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Plantillas Rápidas
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-6">
                  Selecciona una plantilla para comenzar rápidamente con configuraciones optimizadas
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(presets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => loadPreset(key)}
                      className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-lg ${
                        currentPreset === key
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{preset.icon}</span>
                          <span className="font-semibold text-gray-900">{preset.name}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(preset.difficulty)}`}>
                          {getDifficultyText(preset.difficulty)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{preset.labels.length} señas</span>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>~{preset.estimatedTime} min</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Señas del Modelo
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {form.type === 'standard' && (
                  <div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Añadir nueva seña..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        onKeyPress={(e) => e.key === 'Enter' && addLabel()}
                      />
                      <button
                        onClick={addLabel}
                        disabled={!newLabel.trim() || form.labels.includes(newLabel.trim())}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {newLabel.trim() && form.labels.includes(newLabel.trim()) && (
                      <p className="text-red-600 text-xs mt-1">Esta seña ya existe</p>
                    )}
                  </div>
                )}

                {form.labels.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                    {form.labels.map((label, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900">{label}</span>
                        </div>
                        {form.type === 'standard' && (
                          <button
                            onClick={() => removeLabel(label)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    {form.type === 'standard' ? (
                      <>
                        <div className="text-6xl mb-4">✋</div>
                        <p className="text-gray-500 font-medium">Añade las señas que quieres reconocer</p>
                        <p className="text-sm text-gray-400 mt-1">Mínimo 2 señas requeridas</p>
                      </>
                    ) : (
                      <>
                        <Calculator className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Modelo Aritmético Configurado</p>
                        <p className="text-sm text-gray-400 mt-1">16 señas predefinidas incluidas</p>
                      </>
                    )}
                  </div>
                )}

                {form.type === 'arithmetic' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h4 className="font-semibold text-purple-900 mb-3">Señas Incluidas:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <strong className="text-purple-800">Números:</strong>
                        <div className="text-purple-700">0, 1, 2, 3, 4, 5, 6, 7, 8, 9</div>
                      </div>
                      <div>
                        <strong className="text-purple-800">Operadores:</strong>
                        <div className="text-purple-700">+, -, x, /</div>
                      </div>
                      <div className="col-span-2">
                        <strong className="text-purple-800">Control:</strong>
                        <div className="text-purple-700">espacio (separar), enter (calcular)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Resumen del Entrenamiento
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Señas definidas:</span>
                  <span className="font-semibold text-blue-900">{form.labels.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Muestras por seña:</span>
                  <span className="font-semibold text-blue-900">{form.samplesPerLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total de capturas:</span>
                  <span className="font-semibold text-blue-900">{form.labels.length * form.samplesPerLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Tiempo estimado:</span>
                  <span className="font-semibold text-blue-900">~{Math.ceil((form.labels.length * form.samplesPerLabel) / 20)} min</span>
                </div>
                {form.type === 'arithmetic' && (
                  <div className="pt-2 border-t border-blue-200">
                    <span className="text-blue-700 text-xs">✨ Incluye interface especial de calculadora</span>
                  </div>
                )}
              </div>
            </div>

            {form.labels.length >= 2 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  ¡Listo para Entrenar!
                </h3>
                <div className="space-y-2 text-sm text-green-800">
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                    <span>Captura automática inteligente</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                    <span>Control individual por seña</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                    <span>Filtros de calidad automáticos</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                    <span>Variación de posiciones optimizada</span>
                  </div>
                </div>
              </div>
            )}

            {form.labels.length > 15 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Modelo Grande Detectado
                </h3>
                <div className="space-y-1 text-sm text-yellow-800">
                  <p>• {form.labels.length} señas requieren más tiempo de entrenamiento</p>
                  <p>• Considera reducir muestras por seña a 15-20 para acelerar</p>
                  <p>• El proceso puede tomar hasta {Math.ceil((form.labels.length * form.samplesPerLabel) / 15)} minutos</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <button
            onClick={handleCancel}
            className="w-full sm:w-auto px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
          >
            Cancelar
          </button>
         
          <button
            onClick={startTraining}
            disabled={!form.name.trim() || form.labels.length < 2}
            className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
          >
            <Save className="h-5 w-5" />
            <span>Comenzar Entrenamiento</span>
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}