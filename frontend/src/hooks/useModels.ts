import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Model } from '@/types'

export const useModels = () => {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/models')
      setModels(response.data)
    } catch (err: any) {
      setError('Error al cargar modelos: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const deleteModel = async (modelId: string) => {
    try {
      await api.delete(`/models/${modelId}`)
      setModels(prev => prev.filter(model => model.id !== modelId))
      return { success: true }
    } catch (err: any) {
      const errorMessage = 'Error al eliminar modelo: ' + (err.response?.data?.detail || err.message)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateModel = async (modelId: string, updates: Partial<Model>) => {
    try {
      const response = await api.put(`/models/${modelId}`, updates)
      setModels(prev => prev.map(model =>
        model.id === modelId ? { ...model, ...response.data } : model
      ))
      return { success: true, data: response.data }
    } catch (err: any) {
      const errorMessage = 'Error al actualizar modelo: ' + (err.response?.data?.detail || err.message)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const getModel = async (modelId: string) => {
    try {
      const response = await api.get(`/models/${modelId}`)
      return { success: true, data: response.data }
    } catch (err: any) {
      const errorMessage = 'Error al obtener modelo: ' + (err.response?.data?.detail || err.message)
      return { success: false, error: errorMessage }
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  return {
    models,
    loading,
    error,
    fetchModels,
    deleteModel,
    updateModel,
    getModel
  }
}