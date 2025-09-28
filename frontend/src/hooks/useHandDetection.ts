import { useState, useEffect, useCallback, RefObject, useRef } from 'react'

export const useHandDetection = (
  videoRef: RefObject<HTMLVideoElement>,
  canvasRef: RefObject<HTMLCanvasElement>,
  onLandmarksDetected?: (landmarks: any[]) => void,
  mode: 'fast' | 'accurate' | 'hybrid' = 'fast'
) => {
  const [landmarks, setLandmarks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hands, setHands] = useState<any>(null)
  const [performanceStats, setPerformanceStats] = useState({ fps: 0, avgProcessingTime: 0 })

  const lastProcessTime = useRef(0)
  const isProcessing = useRef(false)
  const frameCount = useRef(0)
  const processingTimes = useRef<number[]>([])
  const lastFpsUpdate = useRef(Date.now())

  const drawLandmarks = useCallback((results: any) => {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const handLandmarks of results.multiHandLandmarks) {
        ctx.strokeStyle = '#00FF00'
        ctx.lineWidth = 2
        ctx.fillStyle = '#FF0000'

        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4],
          [0, 5], [5, 6], [6, 7], [7, 8],
          [5, 9], [9, 10], [10, 11], [11, 12],
          [9, 13], [13, 14], [14, 15], [15, 16],
          [13, 17], [17, 18], [18, 19], [19, 20],
          [0, 17]
        ]

        ctx.beginPath()
        for (const [start, end] of connections) {
          const startLandmark = handLandmarks[start]
          const endLandmark = handLandmarks[end]

          if (startLandmark && endLandmark) {
            const startX = (1 - startLandmark.x) * canvas.width
            const startY = startLandmark.y * canvas.height
            const endX = (1 - endLandmark.x) * canvas.width
            const endY = endLandmark.y * canvas.height

            ctx.moveTo(startX, startY)
            ctx.lineTo(endX, endY)
          }
        }
        ctx.stroke()

        for (let i = 0; i < handLandmarks.length; i++) {
          const landmark = handLandmarks[i]
          const x = (1 - landmark.x) * canvas.width
          const y = landmark.y * canvas.height

          ctx.beginPath()
          ctx.arc(x, y, 3, 0, 2 * Math.PI)
          ctx.fill()

          if ([0, 4, 8, 12, 16, 20].includes(i)) {
            ctx.beginPath()
            ctx.arc(x, y, 5, 0, 2 * Math.PI)
            ctx.strokeStyle = '#FFD700'
            ctx.lineWidth = 2
            ctx.stroke()
            ctx.strokeStyle = '#00FF00'
            ctx.lineWidth = 2
          }
        }
      }
    }
  }, [canvasRef, videoRef])

  const updatePerformanceStats = useCallback((processingTime: number) => {
    frameCount.current++
    processingTimes.current.push(processingTime)

    if (processingTimes.current.length > 30) {
      processingTimes.current.shift()
    }

    const now = Date.now()
    if (now - lastFpsUpdate.current >= 1000) {
      const fps = frameCount.current
      const avgProcessingTime = processingTimes.current.reduce((a, b) => a + b, 0) / processingTimes.current.length

      setPerformanceStats({ fps, avgProcessingTime })
      frameCount.current = 0
      lastFpsUpdate.current = now
    }
  }, [])

  const onResults = useCallback((results: any) => {
    const processingStartTime = window.performance.now()

    const detectedLandmarks = results.multiHandLandmarks || []

    const processedLandmarks = detectedLandmarks.map((handLandmarks: any) => {
      return handLandmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z
      }))
    })

    setLandmarks(processedLandmarks)
    onLandmarksDetected?.(processedLandmarks)
    drawLandmarks(results)

    const processingTime = window.performance.now() - processingStartTime
    updatePerformanceStats(processingTime)

    isProcessing.current = false
  }, [drawLandmarks, onLandmarksDetected, updatePerformanceStats])

  useEffect(() => {
    let mounted = true

    const initializeHands = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js'
        script.crossOrigin = 'anonymous'
        
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => resolve(null)
          script.onerror = () => reject(new Error('Failed to load MediaPipe script'))
        })

        document.head.appendChild(script)
        await loadPromise

        if (!mounted) return

        await new Promise(resolve => setTimeout(resolve, 500))

        const handsInstance = new (window as any).Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
          }
        })

        if (!mounted) return

        const config = {
          fast: {
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          },
          accurate: {
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.8,
            minTrackingConfidence: 0.8
          },
          hybrid: {
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.6
          }
        }

        handsInstance.setOptions(config[mode])
        handsInstance.onResults(onResults)

        if (mounted) {
          setHands(handsInstance)
          setIsLoading(false)
        }
      } catch (err: any) {
        console.error('MediaPipe initialization error:', err)
        if (mounted) {
          setError('Error al cargar MediaPipe. Verifica tu conexión a internet.')
          setIsLoading(false)
        }
      }
    }

    initializeHands()

    return () => {
      mounted = false
      if (hands && typeof hands.close === 'function') hands.close()
    }
  }, [mode, onResults])

  useEffect(() => {
    if (!hands || isLoading) return

    let animationId: number

    const targetFps = mode === 'fast' ? 30 : mode === 'accurate' ? 15 : 20
    const frameInterval = 1000 / targetFps

    const processVideo = async () => {
      const video = videoRef.current
      const now = Date.now()

      if (
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !video.paused &&
        !video.ended &&
        !isProcessing.current &&
        now - lastProcessTime.current >= frameInterval
      ) {
        try {
          isProcessing.current = true
          lastProcessTime.current = now
          await hands.send({ image: video })
        } catch (err) {
          console.error('Hand detection error:', err)
          isProcessing.current = false
        }
      }

      animationId = requestAnimationFrame(processVideo)
    }

    processVideo()

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [hands, isLoading, videoRef, mode])

  return {
    landmarks,
    isLoading,
    error,
    performance: performanceStats
  }
}