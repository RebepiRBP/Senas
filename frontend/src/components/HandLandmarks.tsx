import { useEffect, useRef } from 'react'
import { useHandDetection } from '@/hooks/useHandDetection'

interface HandLandmarksProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onLandmarksDetected?: (landmarks: any[]) => void
}

export default function HandLandmarks({ videoRef, onLandmarksDetected }: HandLandmarksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { landmarks, isLoading, error } = useHandDetection(
    videoRef,
    canvasRef,
    onLandmarksDetected
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        const rect = video.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
      }
    }

    const handleResize = () => updateCanvasSize()
    const handleLoadedMetadata = () => updateCanvasSize()

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('resize', handleResize)
    window.addEventListener('resize', handleResize)

    const resizeObserver = new ResizeObserver(updateCanvasSize)
    resizeObserver.observe(video)

    updateCanvasSize()

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('resize', handleResize)
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [videoRef])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          zIndex: 10
        }}
      />
      {isLoading && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-white px-2 py-1 rounded text-xs">
          Cargando detector...
        </div>
      )}
      {error && (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded text-xs">
          Error: {error}
        </div>
      )}
      {landmarks.length > 0 && (
        <div className="absolute top-4 left-4 bg-green-500 text-white px-2 py-1 rounded text-xs">
          {landmarks.length} mano{landmarks.length > 1 ? 's' : ''} detectada{landmarks.length > 1 ? 's' : ''}
        </div>
      )}
    </>
  )
}