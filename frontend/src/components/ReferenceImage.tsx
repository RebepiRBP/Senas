import { useState } from 'react'
import { Image, AlertCircle, Download, Eye, X, Maximize2 } from 'lucide-react'

interface ReferenceImageProps {
  imageData?: string
  label?: string
  className?: string
  showControls?: boolean
  onImageClick?: () => void
}

export default function ReferenceImage({
  imageData,
  label,
  className = '',
  showControls = true,
  onImageClick
}: ReferenceImageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const handleImageLoad = () => {
    setLoading(false)
  }

  const handleDownload = () => {
    if (!imageData) return

    const link = document.createElement('a')
    link.href = imageData
    link.download = `referencia-${label || 'seña'}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleFullscreen = () => {
    setShowFullscreen(!showFullscreen)
    onImageClick?.()
  }

  if (!imageData) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl ${className}`}>
        <div className="text-center text-gray-500 p-8">
          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium mb-2">No hay imagen de referencia</p>
          <p className="text-sm">Esta seña no tiene imagen de referencia disponible</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`relative group ${className}`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl z-10">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                <Image className="h-6 w-6 text-white" />
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Cargando imagen...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex items-center justify-center h-64 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200">
            <div className="text-center text-red-500 p-8">
              <div className="w-16 h-16 bg-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <p className="text-lg font-medium mb-2">Error al cargar la imagen</p>
              <p className="text-sm">La imagen de referencia no pudo cargarse</p>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100">
            <img
              src={imageData}
              alt={`Referencia para ${label}`}
              className="w-full h-64 object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
              onLoad={handleImageLoad}
              onError={() => {
                setLoading(false)
                setError(true)
              }}
              onClick={toggleFullscreen}
            />

            {!loading && !error && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-2xl">
                {showControls && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFullscreen()
                      }}
                      className="p-2 bg-white bg-opacity-90 hover:bg-white text-gray-700 rounded-full transition-all shadow-lg hover:shadow-xl"
                      title="Ver en pantalla completa"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload()
                      }}
                      className="p-2 bg-white bg-opacity-90 hover:bg-white text-gray-700 rounded-full transition-all shadow-lg hover:shadow-xl"
                      title="Descargar imagen"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white bg-opacity-90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-xl shadow-lg">
                    <div className="font-semibold">Referencia: {label}</div>
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-white bg-opacity-90 backdrop-blur-sm p-3 rounded-full shadow-xl">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
            )}

            {!showControls && !loading && !error && (
              <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-xl shadow-lg">
                <div className="font-semibold text-sm">Referencia: {label}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {showFullscreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={imageData}
              alt={`Referencia para ${label} - Vista completa`}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
            <div className="absolute top-4 right-4 flex space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload()
                }}
                className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full transition-all backdrop-blur-sm"
              >
                <Download className="h-6 w-6" />
              </button>
              <button
                onClick={() => setShowFullscreen(false)}
                className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full transition-all backdrop-blur-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 backdrop-blur-sm text-white px-6 py-3 rounded-xl">
              <div className="font-bold text-lg">Referencia: {label}</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}