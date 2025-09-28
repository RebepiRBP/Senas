import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hand, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '@/services/api'

interface SetupData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

interface FirstTimeSetupProps {
  onComplete: () => void
}

export default function FirstTimeSetup({ onComplete }: FirstTimeSetupProps) {
  const [step, setStep] = useState<'welcome' | 'setup' | 'complete'>('welcome')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<SetupData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const navigate = useNavigate()

  const handleInputChange = (field: keyof SetupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.username.trim()) return 'El nombre de usuario es requerido'
    if (formData.username.length < 3) return 'El nombre de usuario debe tener al menos 3 caracteres'
    if (!formData.email.trim()) return 'El email es requerido'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Email inválido'
    if (!formData.password) return 'La contraseña es requerida'
    if (formData.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden'
    return null
  }

  const handleSetupSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await api.post('/admin/setup', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      })
      setStep('complete')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error configurando el administrador')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    onComplete()
    navigate('/login')
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <Hand className="h-16 w-16 text-primary-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Bienvenido a SignRecognition!
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Esta es la primera vez que se inicia el sistema. Necesitamos configurar 
            una cuenta de administrador para comenzar.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
              <span className="text-amber-800 font-medium">Importante</span>
            </div>
            <p className="text-amber-700 text-sm">
              Esta configuración solo aparece una vez. Asegúrate de recordar 
              las credenciales que configures.
            </p>
          </div>
          <button
            onClick={() => setStep('setup')}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Configurar Administrador
          </button>
        </div>
      </div>
    )
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Hand className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">
              Configurar Administrador
            </h2>
            <p className="text-gray-600 mt-2">
              Crea la cuenta del administrador principal
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="admin"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="admin@empresa.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? 
                    <EyeOff className="h-4 w-4 text-gray-400" /> : 
                    <Eye className="h-4 w-4 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Repetir contraseña"
                disabled={loading}
              />
            </div>

            <button
              type="button"
              onClick={handleSetupSubmit}
              disabled={loading}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Configurando...' : 'Crear Administrador'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Configuración Completa!
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            El administrador ha sido configurado correctamente. Ya puedes iniciar 
            sesión y comenzar a usar el sistema.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700 text-sm">
              <strong>Usuario:</strong> {formData.username}<br />
              <strong>Email:</strong> {formData.email}
            </p>
          </div>
          <button
            onClick={handleComplete}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  return null
}