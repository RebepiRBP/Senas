import { useState, useCallback, useRef, RefObject } from 'react'

export const useCamera = (videoRef: RefObject<HTMLVideoElement>) => {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          frameRate: { ideal: 30, min: 15, max: 60 },
          facingMode: 'user'
        },
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        videoRef.current.autoplay = true

        const playPromise = videoRef.current.play()
        if (playPromise !== undefined) {
          try {
            await playPromise
            setIsActive(true)
          } catch {
            const handleCanPlay = () => {
              if (videoRef.current) {
                videoRef.current.play()
                  .then(() => setIsActive(true))
                  .catch(err => {
                    console.error('Error playing video:', err)
                    setError('No se pudo iniciar la reproducción del video')
                  })
                videoRef.current.removeEventListener('canplay', handleCanPlay)
              }
            }
            videoRef.current.addEventListener('canplay', handleCanPlay)
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.removeEventListener('canplay', handleCanPlay)
              }
            }, 5000)
          }
        }
      }
    } catch (err: any) {
      let errorMessage = 'Error al acceder a la cámara'
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en el dispositivo.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.'
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'No se pudo satisfacer las restricciones de la cámara.'
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Error de seguridad al acceder a la cámara.'
      } else {
        errorMessage = `Error de cámara: ${err.message || 'Desconocido'}`
      }
      setError(errorMessage)
      setIsActive(false)
      console.error('Camera error:', err)
    }
  }, [videoRef])

  const stopCamera = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
        videoRef.current.load()
      }
      setIsActive(false)
      setError(null)
    } catch (err) {
      console.error('Error stopping camera:', err)
    }
  }, [videoRef])

  return {
    isActive,
    error,
    startCamera,
    stopCamera
  }
}