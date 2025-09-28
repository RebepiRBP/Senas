import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Activity } from 'lucide-react'
import DetectionMode from '@/components/DetectionMode'
import { api } from '@/services/api'
import { Model } from '@/types'

export default function Detection() {
  const { modelId } = useParams<{ modelId: string }>()
  const navigate = useNavigate()
  const [model, setModel] = useState<Model | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModel = async () => {
      if (!modelId) {
        setError('ID de modelo no válido')
        setLoading(false)
        return
      }

      try {
        const response = await api.get(`/models/${modelId}`)
        setModel(response.data)
      } catch (err: any) {
        setError('Error al cargar el modelo: ' + (err.response?.data?.detail || err.message))
      } finally {
        setLoading(false)
      }
    }

    fetchModel()
  }, [modelId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg animate-pulse">Cargando modelo de detección...</p>
        </div>
      </div>
    )
  }

  if (error || !model) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Volver al inicio</span>
          </button>

          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-24 h-24 mx-auto mb-8 bg-red-100 rounded-3xl flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error al cargar el modelo</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Volver al inicio</span>
        </button>

        <DetectionMode
          modelId={model.id}
          modelName={model.name}
          model={model}
        />
      </div>
    </div>
  )
}