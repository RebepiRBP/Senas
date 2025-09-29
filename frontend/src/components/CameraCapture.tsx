import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import HandLandmarks from './HandLandmarks'

interface CameraCaptureProps {
  onFrame?: (imageData: string, landmarks: any[]) => void
  showLandmarks?: boolean
  className?: string
}

export interface CameraCaptureHandle {
  takeSnapshot: () => { imageData: string; landmarks: any[] } | null
}

const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  ({ onFrame, showLandmarks = true, className = "" }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [landmarks, setLandmarks] = useState<any[]>([])
    const [isInitializing, setIsInitializing] = useState(false)
    const [videoReady, setVideoReady] = useState(false)
    const [frameCount, setFrameCount] = useState(0)
    const [isCapturingFrame, setIsCapturingFrame] = useState(false)

    const { isActive, error, startCamera, stopCamera } = useCamera(videoRef)

    const takeSnapshot = useCallback(() => {
      const video = videoRef.current
      const canvas = canvasRef.current
     
      if (!video || !canvas || !videoReady) return null
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null

      try {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
       
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
          ctx.restore()
         
          const imageData = canvas.toDataURL('image/jpeg', 0.9)
          return { imageData, landmarks }
        }
      } catch (err) {
        console.error('Error capturing frame:', err)
      }
      return null
    }, [landmarks, videoReady])

    useImperativeHandle(ref, () => ({
      takeSnapshot
    }))

    const captureFrame = useCallback(() => {
      if (!onFrame || !videoReady || !isActive || isCapturingFrame) return
     
      setIsCapturingFrame(true)
      const snapshot = takeSnapshot()
      if (snapshot) {
        onFrame(snapshot.imageData, snapshot.landmarks)
        setFrameCount(prev => prev + 1)
      }
     
      setTimeout(() => setIsCapturingFrame(false), 16)
    }, [onFrame, takeSnapshot, videoReady, isActive, isCapturingFrame])

    useEffect(() => {
      if (!isActive || !onFrame) return

      const intervalId = setInterval(captureFrame, 33)
      return () => clearInterval(intervalId)
    }, [isActive, captureFrame, onFrame])

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const handleLoadedMetadata = () => {
        setVideoReady(true)
        setIsInitializing(false)
      }

      const handleCanPlay = () => {
        setVideoReady(true)
        setIsInitializing(false)
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('canplay', handleCanPlay)

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('canplay', handleCanPlay)
      }
    }, [isActive])

    const handleStartCamera = useCallback(async () => {
      try {
        setIsInitializing(true)
        setVideoReady(false)
        await startCamera()
      } catch (err) {
        console.error('Error starting camera:', err)
        setIsInitializing(false)
      }
    }, [startCamera])

    const handleStopCamera = useCallback(() => {
      stopCamera()
      setLandmarks([])
      setVideoReady(false)
      setIsInitializing(false)
      setFrameCount(0)
      setIsCapturingFrame(false)
    }, [stopCamera])

    return (
      <div 
        className={`relative bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden w-full shadow-2xl border border-gray-700 ${className}`}
        style={{ 
          height: 'auto',
          minHeight: '300px',
          aspectRatio: '4/3'
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            display: isActive && videoReady ? 'block' : 'none',
            transform: 'scaleX(-1)'
          }}
        />
       
        <canvas ref={canvasRef} className="hidden" />
       
        {showLandmarks && isActive && videoReady && (
          <HandLandmarks
            videoRef={videoRef}
            onLandmarksDetected={setLandmarks}
          />
        )}

        <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          {!isActive ? (
            <button
              onClick={handleStartCamera}
              disabled={isInitializing}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-2xl hover:from-primary-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-semibold min-w-[120px] sm:min-w-[160px]"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="hidden xs:inline">{isInitializing ? 'Iniciando...' : 'Iniciar Cámara'}</span>
              <span className="xs:hidden">{isInitializing ? '...' : 'Iniciar'}</span>
            </button>
          ) : (
            <button
              onClick={handleStopCamera}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-semibold min-w-[120px] sm:min-w-[160px]"
            >
              <CameraOff className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="hidden xs:inline">Detener Cámara</span>
              <span className="xs:hidden">Detener</span>
            </button>
          )}
        </div>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
            <div className="text-center text-white p-4 sm:p-6 max-w-xs sm:max-w-sm mx-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              </div>
              <p className="text-sm sm:text-lg font-semibold mb-2">Error de cámara</p>
              <p className="text-xs sm:text-sm opacity-80 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {(isInitializing || (isActive && !videoReady)) && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center text-gray-300 p-4 sm:p-6">
              <div className="relative mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary-200 rounded-full mx-auto"></div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-12 sm:w-16 sm:h-16 border-4 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-sm sm:text-lg font-medium mb-1">Iniciando cámara</p>
              <p className="text-xs sm:text-sm opacity-70">Configurando video...</p>
            </div>
          </div>
        )}

        {isActive && videoReady && (
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-black bg-opacity-60 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm backdrop-blur-sm border border-white border-opacity-20">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">Landmarks: {landmarks.length}</span>
              <span className="sm:hidden">{landmarks.length}</span>
              <span className="hidden sm:inline">| Frames: {frameCount}</span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-primary-600/20 via-transparent to-blue-600/20 pointer-events-none"></div>
      </div>
    )
  }
)

CameraCapture.displayName = 'CameraCapture'

export default CameraCapture