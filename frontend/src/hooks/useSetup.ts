import { useState, useEffect } from 'react'
import { api } from '@/services/api'

interface SetupStatus {
  initialized: boolean
  requiresSetup: boolean
}

export const useSetup = () => {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkSetupStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/admin/setup/status')
      setSetupStatus(response.data)
    } catch (err: any) {
      setError('Error checking setup status')
      console.error('Setup status error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSetupStatus()
  }, [])

  return {
    setupStatus,
    loading,
    error,
    refetch: checkSetupStatus
  }
}