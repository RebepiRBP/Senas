export interface Model {
  id: string
  name: string
  description: string
  categories: string[]
  labels: string[]
  accuracy: number
  lastTrained: string
  createdAt: string
  updatedAt: string
  status: 'training' | 'ready' | 'error'
  version: number
  type?: 'standard' | 'arithmetic'
}

export interface TrainingData {
  id: string
  label: string
  imageData: string
  landmarks: any
  timestamp: string
}

export interface DetectionResult {
  id: string
  modelId: string
  prediction: string
  confidence: number
  timestamp: string
  landmarks: any
}

export interface ArithmeticOperation {
  id: string
  expression: string[]
  result: number | null
  timestamp: string
}

export interface ArithmeticState {
  buffer: string
  tokens: string[]
  lastDetection: string | null
  lastDetectionTime: number
  operations: ArithmeticOperation[]
  currentResult: number | null
}

export interface ModelMetrics {
  accuracy: number
  totalSamples: number
  trainingTime: number
  trainingHistory: Array<{
    epoch: number
    accuracy: number
    loss: number
    valAccuracy?: number
    valLoss?: number
  }>
  confusionMatrix: Record<string, {
    precision: number
    recall: number
    f1Score: number
    support: number
  }>
  classDistribution: Record<string, number>
}

export interface User {
  id: string
  username: string
  email: string
  createdAt: string
  lastLogin: string
  isActive: boolean
  role: 'user' | 'admin'
}

export interface SystemStats {
  totalUsers: number
  totalModels: number
  totalTrainingSamples: number
  diskUsage: number
  systemUptime: number
  activeUsers: number
}

export interface TrainingProgress {
  modelId: string
  currentEpoch: number
  totalEpochs: number
  currentLoss: number
  currentAccuracy: number
  estimatedTimeRemaining: number
  status: 'preparing' | 'training' | 'validating' | 'completed' | 'error'
}

export interface CameraSettings {
  width: number
  height: number
  facingMode: 'user' | 'environment'
  frameRate: number
}

export interface HandLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface HandDetectionResult {
  landmarks: HandLandmark[]
  handedness: 'Left' | 'Right'
  confidence: number
}