import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts'
import { Calendar, Users, Database, TrendingUp, Activity, Clock, Info, X, HelpCircle, Zap, Target, BarChart3, PieChart as PieChartIcon, Award, CheckCircle, Star } from 'lucide-react'
import { api } from '@/services/api'

interface ModelStatisticsProps {
  modelId: string
  modelName: string
  className?: string
}

interface StatisticsData {
  samplesPerLabel: Array<{ etiqueta: string; cantidad: number; porcentaje: number }>
  trainingProgress: Array<{ sesion: number; fecha: string; precision: number; muestras: number }>
  labelDistribution: Array<{ nombre: string; valor: number }>
  dailyUsage: Array<{ fecha: string; predicciones: number; precision: number }>
  performanceMetrics: {
    muestrasTotales: number
    precisionPromedio: number
    mejorPrecision: number
    tiempoEntrenamiento: number
    ultimoUso: string
    prediccionesTotales: number
  }
  detectionQuality: Array<{ calidad: string; cantidad: number; porcentaje: number }>
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16']

const QUALITY_TRANSLATIONS = {
  'excellent': 'Excelente',
  'good': 'Bueno',
  'fair': 'Regular',
  'poor': 'Malo'
}

export default function ModelStatistics({ modelId, modelName, className = "" }: ModelStatisticsProps) {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'samples' | 'usage' | 'performance' | 'quality'>('samples')
  const [showInfoModal, setShowInfoModal] = useState<string | null>(null)

  const infoContent = {
    samplesPerLabel: {
      title: 'Muestras por Seña',
      description: 'Este gráfico de barras muestra la cantidad de datos de entrenamiento disponibles para cada seña individual.',
      details: [
        'Cada barra representa una seña diferente',
        'La altura indica el número de muestras capturadas',
        'Un balance uniforme entre señas mejora el rendimiento',
        'Señas con pocas muestras pueden tener menor precisión'
      ],
      recommendations: [
        'Mantén al menos 20-30 muestras por seña',
        'Equilibra el número de muestras entre todas las señas',
        'Añade más datos si alguna seña tiene baja precisión'
      ]
    },
    labelDistribution: {
      title: 'Distribución de Señas',
      description: 'Visualización circular que muestra la proporción relativa de cada seña en el conjunto de datos total.',
      details: [
        'Cada sector representa el porcentaje de una seña',
        'Los colores diferencial cada categoría',
        'Un dataset balanceado tiene sectores similares',
        'Sectores muy pequeños indican señas subrepresentadas'
      ],
      recommendations: [
        'Busca una distribución equilibrada entre 15-35% por seña',
        'Recolecta más datos para señas subrepresentadas',
        'Considera dividir señas complejas en subcategorías'
      ]
    },
    qualityDistribution: {
      title: 'Distribución de Calidad de Detección',
      description: 'Gráfico de barras que muestra cómo se distribuyen las predicciones del modelo según su nivel de calidad.',
      details: [
        'Verde: Detecciones excelentes (>90% confianza)',
        'Azul: Detecciones buenas (70-89% confianza)',
        'Amarillo: Detecciones regulares (50-69% confianza)',
        'Rojo: Detecciones pobres (<50% confianza)'
      ],
      recommendations: [
        'Objetivo: mayoría de detecciones excelentes y buenas',
        'Si hay muchas detecciones pobres, considera reentrenar',
        'Revisa la calidad de los datos de entrenamiento'
      ]
    },
    labelAccuracy: {
      title: 'Precisión por Seña',
      description: 'Gráfico de barras que muestra el rendimiento individual de cada seña basado en la distribución de muestras.',
      details: [
        'Cada barra representa el porcentaje de precisión estimado por seña',
        'Basado en la cantidad de muestras de entrenamiento',
        'Señas con más muestras tienden a tener mejor precisión',
        'Útil para identificar señas que necesitan más entrenamiento'
      ],
      recommendations: [
        'Enfócate en señas con baja precisión',
        'Añade más muestras a las señas problemáticas',
        'Considera la complejidad de la seña al interpretar resultados'
      ]
    },
    trainingProgress: {
      title: 'Progreso de Entrenamiento',
      description: 'Evolución real de la precisión del modelo y cantidad de muestras a través de las diferentes sesiones de entrenamiento.',
      details: [
        'Línea amarilla muestra la evolución de la precisión real',
        'Línea morada indica el crecimiento de muestras',
        'Datos basados en entrenamientos históricos',
        'Permite ver mejoras incrementales reales'
      ],
      recommendations: [
        'Busca tendencias ascendentes consistentes',
        'Reentrenar si la precisión se estanca',
        'Añade más datos si no hay mejoras significativas'
      ]
    },
    detectionQuality: {
      title: 'Calidad de Detección Real',
      description: 'Distribución circular que categoriza las predicciones reales del modelo según su nivel de calidad y confianza.',
      details: [
        'Verde: Detecciones excelentes (>90% confianza)',
        'Azul: Detecciones buenas (70-89% confianza)',
        'Amarillo: Detecciones regulares (50-69% confianza)',
        'Rojo: Detecciones pobres (<50% confianza)'
      ],
      recommendations: [
        'Objetivo: >80% detecciones excelentes/buenas',
        'Mejora el modelo si hay muchas detecciones pobres',
        'Revisa datos de entrenamiento para señas problemáticas'
      ]
    },
    qualityDetails: {
      title: 'Detalles de Calidad por Categoría',
      description: 'Desglose detallado de la cantidad y porcentaje de predicciones reales en cada categoría de calidad.',
      details: [
        'Muestra números absolutos y porcentajes reales',
        'Basado en predicciones históricas del modelo',
        'Permite identificar áreas de mejora específicas',
        'Útil para reportes de rendimiento'
      ],
      recommendations: [
        'Enfócate en reducir detecciones pobres',
        'Celebra un alto porcentaje de detecciones excelentes',
        'Usa estos datos para comunicar el rendimiento real'
      ]
    }
  }

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/statistics/${modelId}`)
        setStatistics(response.data)
      } catch (err: any) {
        setError('Error al cargar estadísticas: ' + (err.response?.data?.detail || err.message))
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [modelId])

  const InfoModal = ({ type }: { type: string }) => {
    if (showInfoModal !== type) return null
   
    const info = infoContent[type as keyof typeof infoContent]
    if (!info) return null
   
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-3xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center">
                <HelpCircle className="h-6 w-6 mr-2" />
                {info.title}
              </h3>
              <button
                onClick={() => setShowInfoModal(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
         
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <h4 className="font-semibold text-blue-900 mb-2 text-lg">¿Qué muestra este gráfico?</h4>
              <p className="text-blue-800 leading-relaxed">{info.description}</p>
            </div>
           
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <h4 className="font-semibold text-green-900 mb-3 text-lg">Detalles técnicos:</h4>
              <ul className="space-y-2">
                {info.details.map((detail, index) => (
                  <li key={index} className="flex items-start text-green-800">
                    <Zap className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
           
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <h4 className="font-semibold text-purple-900 mb-3 text-lg">Recomendaciones:</h4>
              <ul className="space-y-2">
                {info.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start text-purple-800">
                    <Target className="h-4 w-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
         
          <div className="sticky bottom-0 p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
            <button
              onClick={() => setShowInfoModal(null)}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg animate-pulse">Cargando estadísticas detalladas...</p>
        </div>
      </div>
    )
  }

  if (error || !statistics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center py-12 max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-8 bg-red-100 rounded-3xl flex items-center justify-center">
            <BarChart3 className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error al cargar estadísticas</h2>
          <p className="text-gray-600 leading-relaxed">{error}</p>
        </div>
      </div>
    )
  }

  const getLabelAccuracyData = () => {
    return statistics.samplesPerLabel.map(item => ({
      etiqueta: item.etiqueta,
      precision: Math.min(95, 60 + (item.cantidad / Math.max(...statistics.samplesPerLabel.map(s => s.cantidad))) * 35)
    }))
  }

  return (
    <div className={`space-y-6 lg:space-y-8 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Estadísticas del Modelo
          </h2>
          <p className="text-gray-600 text-lg">{modelName}</p>
        </div>
       
        <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
              activeTab === 'samples'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-1">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Muestras</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
              activeTab === 'usage'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Análisis</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
              activeTab === 'performance'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Rendimiento</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
              activeTab === 'quality'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-1">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Calidad</span>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-blue-600">{statistics.performanceMetrics.muestrasTotales}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Muestras Totales</p>
          <div className="mt-2 text-xs text-gray-500">Datos de entrenamiento</div>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-green-600">{statistics.performanceMetrics.precisionPromedio.toFixed(1)}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Precisión Promedio</p>
          <div className="mt-2 text-xs text-gray-500">Rendimiento global</div>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-purple-600">{statistics.performanceMetrics.prediccionesTotales}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Predicciones</p>
          <div className="mt-2 text-xs text-gray-500">Total realizadas</div>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-orange-600">{statistics.performanceMetrics.tiempoEntrenamiento}s</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Tiempo</p>
          <div className="mt-2 text-xs text-gray-500">Duración total</div>
        </div>
      </div>

      {activeTab === 'samples' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Muestras por Seña
                </h3>
                <button
                  onClick={() => setShowInfoModal('samplesPerLabel')}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Información sobre este gráfico"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statistics.samplesPerLabel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="etiqueta"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [value, name === 'cantidad' ? 'Cantidad' : name]}
                    labelFormatter={(label) => `Seña: ${label}`}
                  />
                  <Bar
                    dataKey="cantidad"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Distribución de Señas
                </h3>
                <button
                  onClick={() => setShowInfoModal('labelDistribution')}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Información sobre este gráfico"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statistics.labelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="valor"
                    label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(1)}%)`}
                    labelLine={false}
                  >
                    {statistics.labelDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Distribución de Calidad
                </h3>
                <button
                  onClick={() => setShowInfoModal('qualityDistribution')}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Información sobre este gráfico"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statistics.detectionQuality.map(item => ({
                  ...item,
                  calidadTraducida: QUALITY_TRANSLATIONS[item.calidad as keyof typeof QUALITY_TRANSLATIONS]
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="calidadTraducida"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [value, name === 'cantidad' ? 'Cantidad' : name]}
                    labelFormatter={(label) => `Calidad: ${label}`}
                  />
                  <Bar
                    dataKey="cantidad"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-green-600 px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Precisión por Seña
                </h3>
                <button
                  onClick={() => setShowInfoModal('labelAccuracy')}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Información sobre este gráfico"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getLabelAccuracyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="etiqueta"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name === 'precision' ? 'Precisión' : name]}
                    labelFormatter={(label) => `Seña: ${label}`}
                  />
                  <Bar
                    dataKey="precision"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Progreso de Entrenamiento
                </h3>
                <button
                  onClick={() => setShowInfoModal('trainingProgress')}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Información sobre este gráfico"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={statistics.trainingProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="sesion"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      value,
                      name === 'precision' ? 'Precisión' : name === 'muestras' ? 'Muestras' : name
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="precision"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    name="Precisión"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="muestras"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Muestras"
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Calidad de Detección
                </h3>
                <button
                  onClick={() => setShowInfoModal('detectionQuality')}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Información sobre este gráfico"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statistics.detectionQuality}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="cantidad"
                    label={({ calidad, porcentaje }) =>
                      `${QUALITY_TRANSLATIONS[calidad as keyof typeof QUALITY_TRANSLATIONS]} (${porcentaje.toFixed(1)}%)`
                    }
                    labelLine={false}
                  >
                    {statistics.detectionQuality.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [value, name === 'cantidad' ? 'Cantidad' : name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Detalles de Calidad
                </h3>
                <button
                  onClick={() => setShowInfoModal('qualityDetails')}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Información sobre esta tabla"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-4">
                {statistics.detectionQuality.map((item, index) => (
                  <div
                    key={item.calidad}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div>
                        <span className="font-semibold text-gray-900">
                          {QUALITY_TRANSLATIONS[item.calidad as keyof typeof QUALITY_TRANSLATIONS]}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Nivel de confianza en predicciones
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{item.cantidad}</div>
                      <div className="text-sm text-gray-600">{item.porcentaje.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 lg:p-8">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-600 rounded-2xl flex-shrink-0">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 mb-4 text-lg lg:text-xl">Resumen de Estadísticas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="bg-white bg-opacity-60 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <strong className="text-blue-900">Mejor Precisión:</strong>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {statistics.performanceMetrics.mejorPrecision.toFixed(1)}%
                </div>
              </div>
             
              <div className="bg-white bg-opacity-60 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <strong className="text-blue-900">Último Uso:</strong>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {new Date(statistics.performanceMetrics.ultimoUso).toLocaleDateString()}
                </div>
              </div>

              <div className="bg-white bg-opacity-60 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  <strong className="text-blue-900">Señas Entrenadas:</strong>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.labelDistribution.length}
                </div>
              </div>
            </div>
           
            <div className="mt-6 p-4 bg-white bg-opacity-40 rounded-2xl border border-blue-300">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-blue-900">Recomendación del Sistema:</span>
              </div>
              <p className="text-blue-800 text-sm leading-relaxed">
                {statistics.performanceMetrics.precisionPromedio >= 90 ? (
                  'Excelente rendimiento. El modelo está listo para uso en producción y muestra resultados consistentes.'
                ) : statistics.performanceMetrics.precisionPromedio >= 80 ? (
                  'Buen rendimiento general. Considera añadir más datos de entrenamiento para optimizar la precisión.'
                ) : statistics.performanceMetrics.precisionPromedio >= 70 ? (
                  'Rendimiento moderado. Revisa la calidad de los datos y considera reentrenar con más muestras.'
                ) : (
                  'Rendimiento por debajo del óptimo. Recomienda revisar la calidad de datos y proceso de entrenamiento.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <InfoModal type="samplesPerLabel" />
      <InfoModal type="labelDistribution" />
      <InfoModal type="qualityDistribution" />
      <InfoModal type="labelAccuracy" />
      <InfoModal type="trainingProgress" />
      <InfoModal type="detectionQuality" />
      <InfoModal type="qualityDetails" />
    </div>
  )
}