import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, BookOpen, Camera, Brain, Play } from 'lucide-react'

interface TutorialStep {
  id: string
  title: string
  content: string
  icon: React.ReactNode
  tips: string[]
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'introduction',
    title: 'Bienvenido al Sistema de Reconocimiento de Señas',
    content: 'Este sistema te permite crear y entrenar tus propios modelos de reconocimiento de señas de manera personalizada. Puedes entrenar modelos para cualquier tipo de señas: alfabeto, números, operaciones matemáticas o símbolos personalizados.',
    icon: <BookOpen className="h-8 w-8" />,
    tips: [
      'No necesitas conocimientos técnicos previos',
      'El sistema funciona completamente en tu navegador',
      'Puedes crear tantos modelos como necesites'
    ]
  },
  {
    id: 'camera-setup',
    title: 'Configuración de la Cámara',
    content: 'Para obtener los mejores resultados, es importante configurar correctamente tu cámara y entorno de captura.',
    icon: <Camera className="h-8 w-8" />,
    tips: [
      'Asegúrate de tener buena iluminación uniforme',
      'Mantén un fondo simple y sin distracciones',
      'Coloca la cámara a la altura del pecho',
      'Mantén las manos dentro del marco de la cámara',
      'Evita sombras pronunciadas en las manos'
    ]
  },
  {
    id: 'model-creation',
    title: 'Creación de Modelos',
    content: 'Para crear un nuevo modelo, define las categorías de señas que quieres reconocer y proporciona múltiples ejemplos de cada una.',
    icon: <Brain className="h-8 w-8" />,
    tips: [
      'Elige nombres descriptivos para tus modelos',
      'Define claramente las categorías de señas',
      'Captura al menos 20-30 ejemplos por categoría',
      'Varía ligeramente la posición y orientación de las manos',
      'Mantén consistencia en la forma de hacer cada seña'
    ]
  },
  {
    id: 'training-process',
    title: 'Proceso de Entrenamiento',
    content: 'Durante el entrenamiento, el sistema te guiará paso a paso para capturar ejemplos de cada seña que hayas definido.',
    icon: <Play className="h-8 w-8" />,
    tips: [
      'Sigue las instrucciones en pantalla cuidadosamente',
      'Realiza la seña de manera natural y clara',
      'Espera a que el sistema indique cuándo capturar',
      'Si no estás satisfecho con una captura, puedes reiniciar',
      'El entrenamiento puede tomar varios minutos dependiendo del tamaño'
    ]
  }
]

interface TutorialProps {
  isOpen: boolean
  onClose: () => void
}

export default function Tutorial({ isOpen, onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)

  if (!isOpen) return null

  const step = tutorialSteps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === tutorialSteps.length - 1

  const goToNext = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="text-primary-600">
              {step.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-900">Tutorial</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
              <span className="text-sm text-gray-500">
                {currentStep + 1} de {tutorialSteps.length}
              </span>
            </div>
            
            <div className="flex space-x-2 mb-6">
              {tutorialSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToStep(index)}
                  className={`h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary-600 w-8'
                      : index < currentStep
                      ? 'bg-primary-300 w-4'
                      : 'bg-gray-200 w-4'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-gray-700 leading-relaxed">{step.content}</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Consejos importantes:</h4>
              <ul className="space-y-1">
                {step.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-blue-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={goToPrevious}
              disabled={isFirstStep}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                isFirstStep
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>

            {isLastStep ? (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                ¡Empezar!
              </button>
            ) : (
              <button
                onClick={goToNext}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}