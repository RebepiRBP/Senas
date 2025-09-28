import { Link } from 'react-router-dom'
import { Play, Edit, Trash2, Calendar, Target, Clock, Zap, Activity } from 'lucide-react'
import { Model } from '@/types'

interface ModelCardProps {
  model: Model
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
}

export default function ModelCard({ model, onDelete, onEdit }: ModelCardProps) {
  const formatAccuracy = (accuracy: number) => {
    if (accuracy > 1) {
      return `${accuracy.toFixed(1)}%`
    }
    return `${(accuracy * 100).toFixed(1)}%`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'training':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Listo'
      case 'training':
        return 'Entrenando'
      case 'error':
        return 'Error'
      default:
        return 'Desconocido'
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {model.name}
                </h3>
                <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(model.status)} mt-1`}>
                  {getStatusText(model.status)}
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 leading-relaxed mb-4 text-sm sm:text-base line-clamp-2">
            {model.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {model.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100"
            >
              {category}
            </span>
          ))}
          {model.categories.length > 3 && (
            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
              +{model.categories.length - 3} más
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="text-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-base sm:text-lg font-bold text-gray-900">
                {formatAccuracy(model.accuracy)}
              </span>
            </div>
            <span className="text-xs text-gray-600">Precisión</span>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-base sm:text-lg font-bold text-gray-900">
                {model.labels?.length || 0}
              </span>
            </div>
            <span className="text-xs text-gray-600">Señas</span>
          </div>
        </div>

        <div className="flex items-center text-xs sm:text-sm text-gray-500 mb-6">
          <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {new Date(model.lastTrained || model.updatedAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to={`/detection/${model.id}`}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold group/button"
          >
            <Play className="h-4 w-4 group-hover/button:scale-110 transition-transform" />
            <span className="text-sm">Usar</span>
          </Link>
          
          <div className="flex space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(model.id)}
                className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors border border-gray-200 hover:border-blue-200"
                title="Editar modelo"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(model.id)}
                className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors border border-gray-200 hover:border-red-200"
                title="Eliminar modelo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}