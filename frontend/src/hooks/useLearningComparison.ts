import { useState, useCallback, useRef } from 'react'
import { api } from '@/services/api'

export const useLearningComparison = (modelId: string, targetLabel: string) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const lastComparisonTime = useRef(0)
  const comparisonInterval = 500

  const performComparison = useCallback(async (landmarks: any) => {
    const now = Date.now()
    if (now - lastComparisonTime.current < comparisonInterval || isProcessing) {
      return null
    }

    lastComparisonTime.current = now
    setIsProcessing(true)

    try {
      const response = await api.post(`/learning/${modelId}/compare`, {
        landmarks,
        targetLabel
      })

      return {
        prediction: response.data.prediction,
        confidence: response.data.confidence,
        isMatch: response.data.isMatch
      }
    } catch (error) {
      console.error('Error en comparación:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [modelId, targetLabel, isProcessing])

  const resetStats = useCallback(() => {
    setIsProcessing(false)
  }, [])

  return {
    performComparison,
    resetStats,
    isProcessing
  }
}