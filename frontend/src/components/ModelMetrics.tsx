import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Target, Clock, Database, Info, Award, Activity, BarChart3, PieChart as PieChartIcon, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { ModelMetrics as MetricsType } from '@/types'

interface ModelMetricsProps {
  metrics: MetricsType
  className?: string
}

export default function ModelMetrics({ metrics, className = "" }: ModelMetricsProps) {
  const [showInfoModal, setShowInfoModal] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState<string>('all')
  const [showLabelDropdown, setShowLabelDropdown] = useState(false)

  const accuracyData = metrics.trainingHistory.map((point, index) => ({
    epoch: index + 1,
    accuracy: point.accuracy * 100,
    loss: point.loss
  }))

  const allLabels = Object.keys(metrics.confusionMatrix)

  const getFilteredConfusionData = () => {
    if (selectedLabel === 'all') {
      return Object.entries(metrics.confusionMatrix).map(([label, data]) => ({
        label,
        precision: data.precision * 100,
        recall: data.recall * 100,
        f1Score: data.f1Score * 100
      }))
    } else {
      const data = metrics.confusionMatrix[selectedLabel]
      return [{
        label: selectedLabel,
        precision: data.precision * 100,
        recall: data.recall * 100,
        f1Score: data.f1Score * 100
      }]
    }
  }

  const distributionData = Object.entries(metrics.classDistribution).map(([label, count]) => ({
    label,
    count,
    percentage: (count / metrics.totalSamples) * 100
  }))

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16']

  const infoContent = {
    accuracy: {
      title: 'Progreso de Entrenamiento',
      description: 'Muestra cómo mejora la precisión del modelo a lo largo de las épocas de entrenamiento. Una tendencia ascendente indica que el modelo está aprendiendo correctamente.',
      tips: [
        'Una curva ascendente constante es ideal',
        'Si se aplana, el modelo ha convergido',
        'Fluctuaciones grandes pueden indicar problemas'
      ]
    },
    distribution: {
      title: 'Distribución de Clases',
      description: 'Visualiza qué tan balanceado está tu conjunto de datos. Un dataset balanceado (proporciones similares) generalmente produce mejores resultados.',
      tips: [
        'Proporciones similares = mejor rendimiento',
        'Clases desbalanceadas pueden crear sesgos',
        'Considera recolectar más datos de clases minoritarias'
      ]
    },
    confusion: {
      title: 'Métricas por Clase',
      description: 'Precisión: % de predicciones correctas de una clase. Recall: % de casos reales detectados. F1-Score: promedio armónico de precisión y recall.',
      tips: [
        'Precisión alta: pocas falsas alarmas',
        'Recall alto: detecta la mayoría de casos reales',
        'F1-Score balanceea precisión y recall'
      ]
    },
    confusionMatrix: {
      title: 'Rendimiento Detallado por Seña',
      description: 'Muestra el rendimiento detallado del modelo para cada seña. Valores altos indican mejor capacidad de reconocimiento para esa seña específica.',
      tips: [
        'Verde (>90%): Excelente rendimiento',
        'Amarillo (70-89%): Buen rendimiento',
        'Rojo (<70%): Necesita mejora'
      ]
    }
  }

  const InfoModal = ({ type }: { type: string }) => {
    if (showInfoModal !== type) return null
   
    const info = infoContent[type as keyof typeof infoContent]
   
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">{info.title}</h3>
            <button
              onClick={() => setShowInfoModal(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
         
          <div className="p-6 space-y-4">
            <p className="text-gray-700 leading-relaxed">{info.description}</p>
           
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 mb-3 text-sm">Consejos importantes:</h4>
              <ul className="space-y-2">
                {info.tips.map((tip, index) => (
                  <li key={index} className="flex items-start text-sm text-blue-800">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
         
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => setShowInfoModal(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    )
  }

  const CustomDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setShowLabelDropdown(!showLabelDropdown)}
        className="flex items-center justify-between min-w-48 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium text-gray-700"
      >
        <span className="truncate">
          {selectedLabel === 'all' ? 'Todas las señas' : selectedLabel}
        </span>
        <ChevronDown className={`h-4 w-4 ml-2 transform transition-transform ${showLabelDropdown ? 'rotate-180' : ''}`} />
      </button>
      {showLabelDropdown && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
          <div className="p-1">
            <button
              onClick={() => {
                setSelectedLabel('all')
                setShowLabelDropdown(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedLabel === 'all'
                  ? 'bg-purple-100 text-purple-800 font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              Todas las señas
            </button>
            {allLabels.map((label) => (
              <button
                key={label}
                onClick={() => {
                  setSelectedLabel(label)
                  setShowLabelDropdown(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedLabel === label
                    ? 'bg-purple-100 text-purple-800 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className={`space-y-6 lg:space-y-8 ${className}`}>
      {showLabelDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowLabelDropdown(false)}
        />
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-blue-600">
              {(metrics.accuracy * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Precisión General</p>
          <div className="mt-2 text-xs text-gray-500">
            Rendimiento global
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Database className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-green-600">
              {metrics.totalSamples.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Muestras Totales</p>
          <div className="mt-2 text-xs text-gray-500">
            Datos de entrenamiento
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-purple-600">
              {metrics.trainingHistory.length}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Épocas</p>
          <div className="mt-2 text-xs text-gray-500">
            Ciclos de entrenamiento
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-orange-600">
              {metrics.trainingTime}s
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Tiempo</p>
          <div className="mt-2 text-xs text-gray-500">
            Duración total
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Progreso de Entrenamiento
              </h3>
              <button
                onClick={() => setShowInfoModal('accuracy')}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="Información sobre este gráfico"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="epoch"
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
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
                  name="Precisión (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Distribución de Clases
              </h3>
              <button
                onClick={() => setShowInfoModal('distribution')}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="Información sobre este gráfico"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  label={({ label, percentage }) => `${label} (${percentage.toFixed(1)}%)`}
                  labelLine={false}
                >
                  {distributionData.map((_, index) => (
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
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-white" />
              <h3 className="text-lg lg:text-xl font-bold text-white">
                Métricas por Clase
              </h3>
              <button
                onClick={() => setShowInfoModal('confusion')}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors ml-2"
                title="Información sobre este gráfico"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <CustomDropdown />
          </div>
        </div>
        <div className="p-4 lg:p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getFilteredConfusionData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
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
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="precision" fill="#0ea5e9" name="Precisión %" radius={[2, 2, 0, 0]} />
              <Bar dataKey="recall" fill="#10b981" name="Recall %" radius={[2, 2, 0, 0]} />
              <Bar dataKey="f1Score" fill="#f59e0b" name="F1-Score %" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg lg:text-xl font-bold text-white flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Rendimiento Detallado por Seña
            </h3>
            <button
              onClick={() => setShowInfoModal('confusionMatrix')}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              title="Información sobre esta tabla"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Seña
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Precisión
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Recall
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    F1-Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Muestras
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(metrics.confusionMatrix).map(([label, data], index) => (
                  <tr key={label} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-gray-900">{label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        data.precision >= 0.9 ? 'bg-green-100 text-green-800 border-green-200' :
                        data.precision >= 0.7 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {(data.precision * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        data.recall >= 0.9 ? 'bg-green-100 text-green-800 border-green-200' :
                        data.recall >= 0.7 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {(data.recall * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        data.f1Score >= 0.9 ? 'bg-green-100 text-green-800 border-green-200' :
                        data.f1Score >= 0.7 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {(data.f1Score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {data.support}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 lg:p-6">
        <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Interpretación de Resultados
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="bg-white bg-opacity-50 rounded-xl p-4">
            <h5 className="font-semibold mb-2">Precisión General</h5>
            <p className="text-xs">
              {metrics.accuracy >= 0.95 ? 'Excelente (≥95%)' :
               metrics.accuracy >= 0.85 ? 'Muy Buena (≥85%)' :
               metrics.accuracy >= 0.75 ? 'Buena (≥75%)' :
               'Necesita Mejora (<75%)'}
            </p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-xl p-4">
            <h5 className="font-semibold mb-2">Balance de Datos</h5>
            <p className="text-xs">
              {Object.values(metrics.classDistribution).every(count =>
                Math.abs(count - metrics.totalSamples / Object.keys(metrics.classDistribution).length) <=
                (metrics.totalSamples / Object.keys(metrics.classDistribution).length) * 0.2
              ) ? 'Bien Balanceado' : 'Desbalanceado'}
            </p>
          </div>
          <div className="bg-white bg-opacity-50 rounded-xl p-4">
            <h5 className="font-semibold mb-2">Recomendación</h5>
            <p className="text-xs">
              {metrics.accuracy >= 0.90 ? 'Modelo listo para producción' :
               metrics.accuracy >= 0.80 ? 'Considera más datos de entrenamiento' :
               'Revisa la calidad de los datos'}
            </p>
          </div>
        </div>
      </div>

      <InfoModal type="accuracy" />
      <InfoModal type="distribution" />
      <InfoModal type="confusion" />
      <InfoModal type="confusionMatrix" />
    </div>
  )
}