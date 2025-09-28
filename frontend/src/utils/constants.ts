export const MODEL_CATEGORIES = [
  'alfabeto',
  'números',
  'operaciones',
  'personalizado'
] as const

export const CAMERA_CONSTRAINTS = {
  video: {
    width: { ideal: 640, min: 480, max: 1280 },
    height: { ideal: 480, min: 360, max: 720 },
    frameRate: { ideal: 30, min: 15, max: 60 },
    facingMode: 'user'
  }
}

export const MEDIAPIPE_CONFIG = {
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
}

export const TRAINING_CONFIG = {
  minSamplesPerLabel: 10,
  maxSamplesPerLabel: 100,
  defaultSamplesPerLabel: 25,
  captureDelay: 1000,
  processingTimeout: 300000
}

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    profile: '/auth/profile'
  },
  models: {
    list: '/models',
    create: '/models/create',
    detail: '/models/:id',
    update: '/models/:id',
    delete: '/models/:id',
    train: '/models/:id/train',
    predict: '/models/:id/predict',
    export: '/models/:id/export',
    metrics: '/models/:id/metrics'
  },
  admin: {
    stats: '/admin/stats',
    users: '/admin/users',
    userAction: '/admin/users/:id/:action',
    systemAction: '/admin/system/:action'
  }
}

export const ERROR_MESSAGES = {
  camera: {
    notAllowed: 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.',
    notFound: 'No se encontró ninguna cámara en el dispositivo.',
    notReadable: 'La cámara está siendo usada por otra aplicación.',
    generic: 'Error al acceder a la cámara'
  },
  model: {
    notFound: 'Modelo no encontrado',
    trainingFailed: 'Error durante el entrenamiento del modelo',
    predictionFailed: 'Error al realizar la predicción',
    exportFailed: 'Error al exportar el modelo'
  },
  network: {
    offline: 'Sin conexión a internet',
    timeout: 'La solicitud ha excedido el tiempo límite',
    serverError: 'Error del servidor. Inténtalo más tarde.'
  }
}

export const SUCCESS_MESSAGES = {
  model: {
    created: 'Modelo creado exitosamente',
    updated: 'Modelo actualizado correctamente',
    deleted: 'Modelo eliminado correctamente',
    exported: 'Modelo exportado correctamente'
  },
  training: {
    completed: 'Entrenamiento completado exitosamente',
    started: 'Entrenamiento iniciado'
  }
}

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
]

export const THEME_COLORS = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1'
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309'
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c'
  }
}