import { useState, useEffect } from 'react'
import { Users, Database, Activity, Settings, Trash2, Download, Shield, Server, HardDrive, Clock, TrendingUp, UserCheck, AlertTriangle, CheckCircle2, BarChart3, RefreshCw, Zap, Award } from 'lucide-react'
import { api } from '@/services/api'

interface SystemStats {
  totalModels: number
  totalUsers: number
  totalTrainingSamples: number
  diskUsage: number
  systemUptime: number
}

interface User {
  id: string
  username: string
  email: string
  createdAt: string
  lastLogin: string
  modelCount: number
  isActive: boolean
}

export default function Admin() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system'>('overview')
  const [error, setError] = useState<string | null>(null)
  const [performingAction, setPerformingAction] = useState<string | null>(null)

  useEffect(() => {
    fetchSystemData()
  }, [])

  const fetchSystemData = async () => {
    try {
      setLoading(true)
      const [statsResponse, usersResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ])
      setStats(statsResponse.data)
      setUsers(usersResponse.data)
    } catch (err: any) {
      setError('Error al cargar datos del sistema: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    if (performingAction) return
   
    const user = users.find(u => u.id === userId)
    const confirmMessages = {
      activate: `¿Activar usuario ${user?.username}?`,
      deactivate: `¿Desactivar usuario ${user?.username}?`,
      delete: `¡PELIGRO! ¿Eliminar permanentemente el usuario ${user?.username}? Esta acción no se puede deshacer.`
    }

    if (window.confirm(confirmMessages[action])) {
      try {
        setPerformingAction(`${action}-${userId}`)
        await api.post(`/admin/users/${userId}/${action}`)
        await fetchSystemData()
      } catch (err: any) {
        alert('Error al ejecutar acción: ' + (err.response?.data?.detail || err.message))
      } finally {
        setPerformingAction(null)
      }
    }
  }

  const handleSystemAction = async (action: 'backup' | 'cleanup' | 'reset') => {
    if (performingAction) return
    const confirmMessage = {
      backup: '¿Crear backup del sistema?',
      cleanup: '¿Limpiar archivos temporales y logs antiguos?',
      reset: '¡PELIGRO! ¿Resetear completamente el sistema? Esta acción no se puede deshacer.'
    }

    if (window.confirm(confirmMessage[action])) {
      try {
        setPerformingAction(action)
        const response = await api.post(`/admin/system/${action}`)
        alert(response.data.message || 'Acción completada exitosamente')
        await fetchSystemData()
      } catch (err: any) {
        alert('Error: ' + (err.response?.data?.detail || err.message))
      } finally {
        setPerformingAction(null)
      }
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? CheckCircle2 : AlertTriangle
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg animate-pulse">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-8 lg:mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Panel de Administración
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Gestiona usuarios, estadísticas del sistema y configuraciones avanzadas
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white rounded-2xl p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Resumen</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Usuarios</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'system'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4" />
                  <span className="hidden sm:inline">Sistema</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {activeTab === 'overview' && stats && (
          <div className="space-y-6 lg:space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Users className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                  </div>
                  <span className="text-xl lg:text-2xl font-bold text-blue-600">{stats.totalUsers}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Usuarios Totales</p>
                <div className="mt-2 text-xs text-gray-500">
                  Sistema multiusuario
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <Database className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
                  </div>
                  <span className="text-xl lg:text-2xl font-bold text-green-600">{stats.totalModels}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Modelos Creados</p>
                <div className="mt-2 text-xs text-gray-500">
                  IA entrenada
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-yellow-100 rounded-xl">
                    <Activity className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600" />
                  </div>
                  <span className="text-xl lg:text-2xl font-bold text-yellow-600">{stats.totalTrainingSamples.toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Muestras</p>
                <div className="mt-2 text-xs text-gray-500">
                  Datos de entrenamiento
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <HardDrive className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
                  </div>
                  <span className="text-xl lg:text-2xl font-bold text-purple-600">{formatBytes(stats.diskUsage)}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Uso de Disco</p>
                <div className="mt-2 text-xs text-gray-500">
                  Almacenamiento
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Estado del Sistema
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                      <span className="font-medium text-green-900">Sistema Operativo</span>
                    </div>
                    <div className="text-sm text-green-700">100% Funcional</div>
                  </div>
                 
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                      <div className="text-sm font-medium text-gray-700">Tiempo Activo</div>
                      <div className="text-lg font-bold text-gray-900">{formatUptime(stats.systemUptime)}</div>
                    </div>
                   
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Zap className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                      <div className="text-sm font-medium text-gray-700">Rendimiento</div>
                      <div className="text-lg font-bold text-green-600">Óptimo</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Estadísticas Rápidas
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <span className="text-blue-700 font-medium">Usuarios Activos</span>
                      <span className="text-blue-900 font-bold">{users.filter(u => u.isActive).length}</span>
                    </div>
                   
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <span className="text-green-700 font-medium">Modelos por Usuario</span>
                      <span className="text-green-900 font-bold">
                        {stats.totalUsers > 0 ? Math.round(stats.totalModels / stats.totalUsers) : 0}
                      </span>
                    </div>
                   
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                      <span className="text-yellow-700 font-medium">Muestras por Modelo</span>
                      <span className="text-yellow-900 font-bold">
                        {stats.totalModels > 0 ? Math.round(stats.totalTrainingSamples / stats.totalModels) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
                <p className="text-gray-600">Administra cuentas de usuario y permisos</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserCheck className="h-4 w-4" />
                <span>{users.filter(u => u.isActive).length} de {users.length} activos</span>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No hay usuarios registrados</h3>
                <p className="text-gray-600">Los usuarios aparecerán aquí cuando se registren en el sistema</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {users.map((user) => {
                  const StatusIcon = getStatusIcon(user.isActive)
                  return (
                    <div key={user.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 card-hover">
                      <div className={`p-6 ${user.isActive ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-pink-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                              <Users className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{user.username}</h3>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.isActive)}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {user.isActive ? 'Activo' : 'Inactivo'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p className="truncate">{user.email}</p>
                          <div className="flex items-center justify-between">
                            <span>Modelos creados:</span>
                            <span className="font-semibold text-gray-900">{user.modelCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Último acceso:</span>
                            <span className="font-semibold text-gray-900">
                              {new Date(user.lastLogin).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Registrado:</span>
                            <span className="font-semibold text-gray-900">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUserAction(user.id, user.isActive ? 'deactivate' : 'activate')}
                            disabled={performingAction === `${user.isActive ? 'deactivate' : 'activate'}-${user.id}`}
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                              user.isActive
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200'
                            } disabled:opacity-50`}
                          >
                            {performingAction === `${user.isActive ? 'deactivate' : 'activate'}-${user.id}` ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
                            ) : (
                              user.isActive ? 'Desactivar' : 'Activar'
                            )}
                          </button>

                          <button
                            onClick={() => handleUserAction(user.id, 'delete')}
                            disabled={performingAction === `delete-${user.id}`}
                            className="px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-xl text-xs font-medium border border-red-200 transition-all disabled:opacity-50"
                          >
                            {performingAction === `delete-${user.id}` ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6 lg:space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mantenimiento del Sistema</h2>
              <p className="text-gray-600">Realiza tareas de mantenimiento y gestión del sistema</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Download className="h-5 w-5 mr-2" />
                    Backup Sistema
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    Crea una copia de seguridad completa de todos los datos del sistema incluyendo modelos, usuarios y configuraciones.
                  </p>
                  <button
                    onClick={() => handleSystemAction('backup')}
                    disabled={performingAction === 'backup'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium disabled:opacity-50"
                  >
                    {performingAction === 'backup' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>{performingAction === 'backup' ? 'Creando Backup...' : 'Crear Backup'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Limpiar Sistema
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    Elimina archivos temporales, logs antiguos y datos innecesarios para optimizar el rendimiento del sistema.
                  </p>
                  <button
                    onClick={() => handleSystemAction('cleanup')}
                    disabled={performingAction === 'cleanup'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium disabled:opacity-50"
                  >
                    {performingAction === 'cleanup' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>{performingAction === 'cleanup' ? 'Limpiando...' : 'Limpiar Sistema'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Reset Sistema
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    Restaura el sistema a su estado inicial eliminando todos los datos. Esta acción es irreversible.
                  </p>
                  <button
                    onClick={() => handleSystemAction('reset')}
                    disabled={performingAction === 'reset'}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-2xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium disabled:opacity-50"
                  >
                    {performingAction === 'reset' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>{performingAction === 'reset' ? 'Reseteando...' : 'Reset Sistema'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-amber-900 mb-3">Advertencias de Seguridad Importantes</h4>
                  <div className="space-y-2 text-sm text-amber-800">
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-red-600">•</span>
                      <span>El reset del sistema eliminará TODOS los datos permanentemente incluyendo usuarios, modelos y configuraciones</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-orange-600">•</span>
                      <span>Siempre crea un backup antes de realizar operaciones de mantenimiento críticas</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-yellow-600">•</span>
                      <span>Las acciones de sistema pueden afectar a todos los usuarios conectados</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-amber-600">•</span>
                      <span>Recomendamos realizar estas operaciones durante horas de menor actividad</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Server className="h-5 w-5 mr-2" />
                    Información del Sistema
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl font-bold text-gray-900 mb-1">{formatUptime(stats?.systemUptime || 0)}</div>
                      <div className="text-sm text-gray-600">Tiempo Activo</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-bold text-green-600 mb-1">100%</div>
                      <div className="text-sm text-gray-600">Disponibilidad</div>
                    </div>
                  </div>
                 
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <span className="text-blue-700 font-medium">Estado del Servidor</span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Operativo</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                      <span className="text-purple-700 font-medium">Base de Datos</span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Conectada</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                      <span className="text-yellow-700 font-medium">Almacenamiento</span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Disponible</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Configuración Avanzada
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">Logs del Sistema</h4>
                          <p className="text-sm text-gray-600">Ver registros de actividad</p>
                        </div>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                          Ver Logs
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">Configuración de Red</h4>
                          <p className="text-sm text-gray-600">Ajustes de conectividad</p>
                        </div>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                          Configurar
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">Políticas de Seguridad</h4>
                          <p className="text-sm text-gray-600">Gestionar permisos</p>
                        </div>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                          Gestionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}