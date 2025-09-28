import { useState } from 'react'
import { Volume2, VolumeX, Settings, Mic, MicOff, Pause, Play } from 'lucide-react'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { SpeechConfig } from '@/services/speechService'

interface SpeechControlsProps {
  mode?: 'detection' | 'arithmetic' | 'learning'
  className?: string
  showSettings?: boolean
  onConfigChange?: (config: SpeechConfig) => void
}

export default function SpeechControls({ 
  mode = 'detection', 
  className = '', 
  showSettings = true,
  onConfigChange 
}: SpeechControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const {
    isSupported,
    isReady,
    isSpeaking,
    isPaused,
    voices,
    config,
    error,
    speak,
    updateConfig,
    stop,
    pause,
    resume,
    toggleEnabled
  } = useSpeechSynthesis()

  const handleConfigChange = (updates: Partial<SpeechConfig>) => {
    updateConfig(updates)
    if (onConfigChange) {
      onConfigChange({ ...config, ...updates })
    }
  }

  const testVoice = () => {
    const testMessages = {
      detection: 'Probando síntesis de voz para detección de señas',
      arithmetic: 'Cinco más cinco es igual a diez',
      learning: 'Correcto, has detectado la seña correctamente'
    }
    speak(testMessages[mode])
  }

  if (!isSupported) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Síntesis de voz no disponible en este navegador
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleEnabled}
          className={`p-2 rounded-full transition-colors ${
            config.enabled 
              ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title={config.enabled ? 'Desactivar voz' : 'Activar voz'}
        >
          {config.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        {isSpeaking && (
          <button
            onClick={isPaused ? resume : pause}
            className="p-2 text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-full transition-colors"
            title={isPaused ? 'Reanudar' : 'Pausar'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        )}

        {isSpeaking && (
          <button
            onClick={stop}
            className="p-2 text-red-600 bg-red-100 hover:bg-red-200 rounded-full transition-colors"
            title="Detener"
          >
            <MicOff className="h-4 w-4" />
          </button>
        )}

        {showSettings && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            title="Configuración de voz"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}

        {isReady && config.enabled && (
          <button
            onClick={testVoice}
            className="px-3 py-1 text-xs bg-green-100 text-green-800 hover:bg-green-200 rounded transition-colors"
          >
            Test
          </button>
        )}

        {isSpeaking && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-600">Hablando...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-xs bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {showAdvanced && config.enabled && isReady && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">Configuración de Voz</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voz
              </label>
              <select
                value={config.voice}
                onChange={(e) => handleConfigChange({ voice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Idioma
              </label>
              <select
                value={config.language}
                onChange={(e) => handleConfigChange({ language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="es-ES">Español (España)</option>
                <option value="es-MX">Español (México)</option>
                <option value="es-AR">Español (Argentina)</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Velocidad: {config.rate.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.rate}
                onChange={(e) => handleConfigChange({ rate: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tono: {config.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.pitch}
                onChange={(e) => handleConfigChange({ pitch: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volumen: {Math.round(config.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.volume}
                onChange={(e) => handleConfigChange({ volume: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-2 border-t">
            <button
              onClick={testVoice}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Mic className="h-4 w-4 inline mr-2" />
              Probar Configuración
            </button>
          </div>
        </div>
      )}

      {!isReady && config.enabled && (
        <div className="text-yellow-600 text-xs bg-yellow-50 p-2 rounded flex items-center">
          <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          Inicializando síntesis de voz...
        </div>
      )}
    </div>
  )
}