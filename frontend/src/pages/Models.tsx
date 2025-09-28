import { useState, useEffect, useRef } from 'react'
import { Download, Upload, Eye, Search, Filter, Grid, List, MoreVertical, Trash2, Play, Settings, FileText, Calendar, Activity, Zap, Target, X } from 'lucide-react'
import ModelCard from '@/components/ModelCard'
import ModelMetrics from '@/components/ModelMetrics'
import ModelStatistics from '@/components/ModelStatistics'
import { useModels } from '@/hooks/useModels'
import { api } from '@/services/api'
import { Model, ModelMetrics as MetricsType } from '@/types'

export default function Models() {
  const { models, loading, error, deleteModel, fetchModels } = useModels()
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [modelMetrics, setModelMetrics] = useState<MetricsType | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showStatistics, setShowStatistics] = useState(false)
  const [exportingModels, setExportingModels] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = ['all', 'alfabeto', 'números', 'operaciones', 'personalizado']

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' ||
      model.categories.some(cat => cat.toLowerCase().includes(selectedCategory))
    return matchesSearch && matchesCategory
  })

  const formatAccuracy = (accuracy: number) => {
    if (accuracy > 1) {
      return `${accuracy.toFixed(1)}%`
    }
    return `${(accuracy * 100).toFixed(1)}%`
  }

  const handleViewMetrics = async (model: Model) => {
    setSelectedModel(model)
    setShowMetrics(true)
    setShowStatistics(false)
    setLoadingMetrics(true)
    try {
      const response = await api.get(`/models/${model.id}/metrics`)
      setModelMetrics(response.data)
    } catch (err) {
      console.error('Error loading metrics:', err)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const handleViewStatistics = async (model: Model) => {
    setSelectedModel(model)
    setShowStatistics(true)
    setShowMetrics(false)
  }

  const handleExportModel = async (modelId: string, format: 'tfjs' | 'onnx') => {
    if (exportingModels.has(modelId)) return

    try {
      setExportingModels(prev => new Set(prev).add(modelId))
      const response = await api.post(`/models/${modelId}/export`,
        { format },
        { responseType: 'blob' }
      )

      const blob = new Blob([response.data], { type: 'application/zip' })
      const url = window.URL.createObjectURL(blob)
      
      const model = models.find(m => m.id === modelId)
      const filename = `${model?.name || 'model'}_${format}.zip`
      
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Export error:', err)
      alert('Error al exportar el modelo: ' + (err.response?.data?.detail || err.message))
    } finally {
      setExportingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelId)
        return newSet
      })
    }
  }

  const handleImportClick = () => {
    setShowImportDialog(true)
    setSelectedFile(null)
    setModelName('')
  }

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.zip')) {
      alert('Por favor selecciona un archivo ZIP válido')
      return
    }

    setSelectedFile(file)
  }

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      alert('Por favor selecciona un archivo')
      return
    }

    if (!modelName.trim()) {
      alert('Por favor ingresa un nombre para el modelo')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('model_name', modelName.trim())

      const response = await api.post('/models/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        alert('Modelo importado exitosamente')
        await fetchModels()
        setShowImportDialog(false)
      }
    } catch (err: any) {
      console.error('Import error:', err)
      alert('Error al importar el modelo: ' + (err.response?.data?.detail || err.message))
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este modelo?')) {
      await deleteModel(modelId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg animate-pulse">Cargando modelos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {!showMetrics && !showStatistics ? (
          <>
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                    Gestión de Modelos
                  </h1>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Administra, analiza y optimiza todos tus modelos de reconocimiento
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleImportClick}
                    disabled={importing}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                  >
                    {importing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    <span>{importing ? 'Importando...' : 'Importar'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o descripción..."
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

                <div className="flex bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-l-2xl transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-r-2xl transition-all ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {filteredModels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <div className="text-sm text-gray-500">
                    {filteredModels.length} de {models.length} modelos
                  </div>
                  {searchTerm && (
                    <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Búsqueda: "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-2 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {selectedCategory !== 'all' && (
                    <div className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      Categoría: {selectedCategory}
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className="ml-2 hover:text-indigo-900"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                    <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center">
                      <FileText className="h-12 w-12 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      No hay modelos creados
                    </h3>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                      Crea tu primer modelo o importa un modelo existente para comenzar
                    </p>
                    <button
                      onClick={handleImportClick}
                      className="inline-flex items-center space-x-2 px-6 py-3 border border-blue-600 text-blue-600 rounded-2xl hover:bg-blue-50 transition-colors font-medium"
                    >
                      <Upload className="h-5 w-5" />
                      <span>Importar Modelo</span>
                    </button>
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
                      Intenta ajustar los filtros de búsqueda
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
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                    {filteredModels.map((model) => (
                      <div key={model.id} className="relative group">
                        <ModelCard
                          model={model}
                          onDelete={handleDeleteModel}
                        />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="relative">
                            <button className="p-2 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 rounded-xl shadow-md transition-all backdrop-blur-sm">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-48">
                              <button
                                onClick={() => handleViewMetrics(model)}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl transition-colors"
                              >
                                <div className="flex items-center space-x-2">
                                  <Activity className="h-4 w-4" />
                                  <span>Ver Métricas</span>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => handleViewStatistics(model)}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center space-x-2">
                                  <Target className="h-4 w-4" />
                                  <span>Ver Estadísticas</span>
                                </div>
                              </button>

                              <div className="border-t border-gray-100">
                                <button
                                  onClick={() => handleExportModel(model.id, 'tfjs')}
                                  disabled={exportingModels.has(model.id)}
                                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                  <div className="flex items-center space-x-2">
                                    {exportingModels.has(model.id) ? (
                                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                    <span>Exportar TensorFlow.js</span>
                                  </div>
                                </button>
                                
                                <button
                                  onClick={() => handleExportModel(model.id, 'onnx')}
                                  disabled={exportingModels.has(model.id)}
                                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl transition-colors disabled:opacity-50"
                                >
                                  <div className="flex items-center space-x-2">
                                    {exportingModels.has(model.id) ? (
                                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                    <span>Exportar ONNX</span>
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="hidden sm:grid grid-cols-12 gap-4 p-4 bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-200">
                      <div className="col-span-4">Modelo</div>
                      <div className="col-span-2">Estado</div>
                      <div className="col-span-2">Precisión</div>
                      <div className="col-span-2">Señas</div>
                      <div className="col-span-2">Acciones</div>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                      {filteredModels.map((model) => (
                        <div key={model.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors">
                          <div className="col-span-12 sm:col-span-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Zap className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{model.name}</h3>
                                <p className="text-sm text-gray-500 truncate max-w-48">{model.description}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-span-6 sm:col-span-2 flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                              model.status === 'ready' 
                                ? 'bg-green-100 text-green-800' 
                                : model.status === 'training'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {model.status === 'ready' ? 'Listo' : model.status === 'training' ? 'Entrenando' : 'Error'}
                            </span>
                          </div>
                          
                          <div className="col-span-6 sm:col-span-2 flex items-center">
                            <span className="font-semibold text-gray-900">
                              {formatAccuracy(model.accuracy)}
                            </span>
                          </div>
                          
                          <div className="col-span-6 sm:col-span-2 flex items-center">
                            <span className="text-gray-900">{model.labels?.length || 0}</span>
                          </div>
                          
                          <div className="col-span-6 sm:col-span-2 flex items-center space-x-2">
                            <button
                              onClick={() => window.location.href = `/detection/${model.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Usar modelo"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleViewMetrics(model)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Ver métricas"
                            >
                              <Activity className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleViewStatistics(model)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Ver estadísticas"
                            >
                              <Target className="h-4 w-4" />
                            </button>

                            <div className="relative group">
                              <button
                                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                disabled={exportingModels.has(model.id)}
                                title="Exportar"
                              >
                                {exportingModels.has(model.id) ? (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                              
                              {!exportingModels.has(model.id) && (
                                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-44">
                                  <button
                                    onClick={() => handleExportModel(model.id, 'tfjs')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl transition-colors"
                                  >
                                    TensorFlow.js
                                  </button>
                                  <button
                                    onClick={() => handleExportModel(model.id, 'onnx')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl transition-colors"
                                  >
                                    ONNX
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowMetrics(false)
                  setShowStatistics(false)
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
              >
                <span>← Volver a la gestión</span>
              </button>
              
              <div className="flex items-center space-x-3">
                {showMetrics && (
                  <>
                    <Activity className="h-6 w-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      Métricas del Modelo: {selectedModel?.name}
                    </h2>
                  </>
                )}
                {showStatistics && (
                  <>
                    <Target className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      Estadísticas del Modelo: {selectedModel?.name}
                    </h2>
                  </>
                )}
              </div>
              <p className="text-gray-600 mt-2">
                {showMetrics ? 'Análisis detallado del rendimiento y estadísticas de entrenamiento' : 'Estadísticas de uso y distribución de datos'}
              </p>
            </div>

            {showMetrics && (
              <>
                {loadingMetrics ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  </div>
                ) : modelMetrics ? (
                  <ModelMetrics metrics={modelMetrics} />
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-500">No se pudieron cargar las métricas del modelo</div>
                  </div>
                )}
              </>
            )}

            {showStatistics && selectedModel && (
              <ModelStatistics
                modelId={selectedModel.id}
                modelName={selectedModel.name}
              />
            )}
          </div>
        )}

        {showImportDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">Importar Modelo</h3>
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Modelo
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Ingresa el nombre del modelo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={importing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo del Modelo
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelection}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={importing}
                  />
                </div>

                {selectedFile && (
                  <div className="text-sm text-gray-600">
                    Archivo seleccionado: {selectedFile.name}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <button
                  onClick={() => setShowImportDialog(false)}
                  disabled={importing}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={importing || !selectedFile || !modelName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}