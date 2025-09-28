import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search, Filter, Target, Award, Clock, Play, Star, Activity } from 'lucide-react'
import LearningMode from '@/components/LearningMode'
import { api } from '@/services/api'
import { Model } from '@/types'
import { useModels } from '@/hooks/useModels'

export default function Learn() {
  const { modelId } = useParams<{ modelId: string }>()
  const navigate = useNavigate()
  const [model, setModel] = useState<Model | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { models: allModels, loading: modelsLoading } = useModels()

  const formatAccuracy = (accuracy: number) => {
    if (accuracy > 1) {
      return `${accuracy.toFixed(1)}%`
    }
    return `${(accuracy * 100).toFixed(1)}%`
  }

  const filteredModels = allModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(searchTerm.toLowerCase())
   
    const matchesCategory = selectedCategory === 'all' ||
      model.categories.some(cat => cat.toLowerCase().includes(selectedCategory))
   
    return matchesSearch && matchesCategory && model.status === 'ready'
  })

  useEffect(() => {
    if (modelId) {
      fetchModel(modelId)
    }
  }, [modelId])

  const fetchModel = async (id: string) => {
    setLoading(true)
    setError(null)
   
    try {
      const response = await api.get(`/models/${id}`)
      setModel(response.data)
    } catch (err: any) {
      setError('Error al cargar el modelo: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleModelSelect = (selectedModel: Model) => {
    navigate(`/learn/${selectedModel.id}`)
  }

  if (modelId) {
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <p className="text-gray-600 text-lg animate-pulse">Cargando experiencia de aprendizaje...</p>
          </div>
        </div>
      )
    }

    if (error || !model) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => navigate('/learn')}
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>Volver a la lista</span>
            </button>
           
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-8 bg-red-100 rounded-3xl flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Error al cargar el modelo</h2>
              <p className="text-gray-600 mb-8">{error}</p>
              <button
                onClick={() => navigate('/learn')}
                className="btn-primary"
              >
                Explorar otros modelos
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/learn')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Volver a la lista</span>
          </button>
         
          <LearningMode modelId={model.id} modelName={model.name} />
        </div>
      </div>
    )
  }

  if (modelsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg animate-pulse">Cargando modelos disponibles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
       
        <div className="mb-8 lg:mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Centro de Aprendizaje
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Practica y perfecciona tus señas con retroalimentación inteligente en tiempo real
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar modelos para practicar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all"
              />
            </div>
           
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-12 pr-8 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm appearance-none cursor-pointer min-w-48"
              >
                <option value="all">Todas las categorías</option>
                <option value="alfabeto">Alfabeto</option>
                <option value="números">Números</option>
                <option value="operaciones">Operaciones</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
          </div>
        </div>

        {filteredModels.length === 0 ? (
          <div className="text-center py-16 lg:py-24">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                No hay modelos disponibles
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {allModels.length === 0
                  ? "Necesitas crear y entrenar modelos primero"
                  : "Intenta ajustar los filtros de búsqueda o asegúrate de tener modelos entrenados"
                }
              </p>
              <button
                onClick={() => navigate('/create')}
                className="btn-primary"
              >
                Crear mi primer modelo
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 card-hover"
                >
                  <div className="p-6 lg:p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4 min-w-0 flex-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <BookOpen className="h-7 w-7 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {model.name}
                          </h3>
                          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            Listo para practicar
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-6 text-sm line-clamp-2">
                      {model.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {model.categories.slice(0, 3).map((category) => (
                        <span
                          key={category}
                          className="px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100"
                        >
                          {category}
                        </span>
                      ))}
                      {model.categories.length > 3 && (
                        <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                          +{model.categories.length - 3} más
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                        <div className="flex items-center justify-center mb-1">
                          <Target className="h-4 w-4 text-blue-600 mr-1" />
                          <span className="text-base font-bold text-gray-900">
                            {model.labels.length}
                          </span>
                        </div>
                        <span className="text-xs text-blue-700">Señas</span>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                        <div className="flex items-center justify-center mb-1">
                          <Star className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-base font-bold text-gray-900">
                            {formatAccuracy(model.accuracy)}
                          </span>
                        </div>
                        <span className="text-xs text-green-700">Precisión</span>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                        <div className="flex items-center justify-center mb-1">
                          <Activity className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-base font-bold text-gray-900">
                            A+
                          </span>
                        </div>
                        <span className="text-xs text-purple-700">Nivel</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Progreso estimado:</span>
                        <span className="font-medium">~{Math.ceil(model.labels.length * 2)} min</span>
                      </div>
                     
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">
                          Actualizado: {new Date(model.lastTrained || model.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl group-hover:from-blue-700 group-hover:to-purple-700 transition-all shadow-lg group-hover:shadow-xl">
                        <Play className="h-5 w-5" />
                        <span className="font-semibold">Comenzar Práctica</span>
                        <Award className="h-4 w-4 opacity-75" />
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
                <Target className="h-4 w-4" />
                <span>Mostrando {filteredModels.length} de {allModels.length} modelos disponibles</span>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  )
}