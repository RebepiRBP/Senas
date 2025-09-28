import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Star, TrendingUp, Clock, Target, Zap, BookOpen, ArrowRight } from 'lucide-react'
import ModelCard from '@/components/ModelCard'
import { useModels } from '@/hooks/useModels'
import { Model } from '@/types'

export default function Home() {
  const { models, loading, error, deleteModel } = useModels()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filteredModels, setFilteredModels] = useState<Model[]>([])

  const categories = ['all', 'alfabeto', 'números', 'operaciones', 'personalizado']

  useEffect(() => {
    let filtered = models

    if (searchTerm) {
      filtered = filtered.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(model =>
        model.categories.some(cat => cat.toLowerCase().includes(selectedCategory))
      )
    }

    setFilteredModels(filtered)
  }, [models, searchTerm, selectedCategory])

  const handleDeleteModel = async (modelId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este modelo?')) {
      await deleteModel(modelId)
    }
  }

  const getQuickStats = () => {
    const totalModels = models.length
    const readyModels = models.filter(m => m.status === 'ready').length
    const totalLabels = models.reduce((sum, model) => sum + (model.labels?.length || 0), 0)
    const avgAccuracy = models.length > 0 
      ? models.reduce((sum, model) => sum + model.accuracy, 0) / models.length 
      : 0

    return { totalModels, readyModels, totalLabels, avgAccuracy }
  }

  const stats = getQuickStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 animate-pulse">Cargando tus modelos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-8 lg:mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl mb-6 shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Sistema de Reconocimiento de Señas
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Crea, entrena y gestiona modelos personalizados de reconocimiento de señas con inteligencia artificial
            </p>
          </div>

          {models.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{stats.totalModels}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Modelos Totales</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Star className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-2xl font-bold text-green-600">{stats.readyModels}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Modelos Listos</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{stats.totalLabels}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Señas Entrenadas</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{stats.avgAccuracy.toFixed(0)}%</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Precisión Promedio</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar modelos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-12 pr-8 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm appearance-none cursor-pointer min-w-48"
              >
                <option value="all">Todas las categorías</option>
                <option value="alfabeto">Alfabeto</option>
                <option value="números">Números</option>
                <option value="operaciones">Operaciones</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            <Link
              to="/create"
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-2xl hover:from-primary-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Crear Modelo</span>
              <span className="sm:hidden">Crear</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {filteredModels.length === 0 ? (
          <div className="text-center py-16 lg:py-24">
            {models.length === 0 ? (
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-primary-100 to-blue-100 rounded-3xl flex items-center justify-center">
                  <Zap className="h-12 w-12 text-primary-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  ¡Comienza tu primer modelo!
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Crea tu primer modelo de reconocimiento de señas personalizado. Es fácil, rápido y completamente personalizable.
                </p>
                <div className="space-y-4">
                  <Link
                    to="/create"
                    className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-2xl hover:from-primary-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
                  >
                    <Plus className="h-6 w-6" />
                    <span>Crear mi primer modelo</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 text-left">
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                        <Target className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Fácil de usar</h4>
                      <p className="text-sm text-gray-600">Interfaz intuitiva que te guía paso a paso</p>
                    </div>
                    
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                        <Clock className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Entrenamiento rápido</h4>
                      <p className="text-sm text-gray-600">Entrena tu modelo en pocos minutos</p>
                    </div>
                    
                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                        <Star className="h-6 w-6 text-purple-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Alta precisión</h4>
                      <p className="text-sm text-gray-600">Resultados precisos y confiables</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  No se encontraron modelos
                </h3>
                <p className="text-gray-600 mb-8">
                  Intenta ajustar los filtros de búsqueda o crear un nuevo modelo
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                  }}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  <span>Limpiar filtros</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {filteredModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onDelete={handleDeleteModel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}