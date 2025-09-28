import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
  children?: ReactNode
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  children
}: EmptyStateProps) {
  const ActionButton = () => {
    if (!actionLabel) return null

    const buttonClass = "inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-2xl hover:from-primary-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"

    if (actionTo) {
      return (
        <Link to={actionTo} className={buttonClass}>
          <span>{actionLabel}</span>
        </Link>
      )
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={buttonClass}>
          <span>{actionLabel}</span>
        </button>
      )
    }

    return null
  }

  return (
    <div className="text-center py-16 lg:py-24">
      <div className="max-w-md mx-auto">
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h3>
        <p className="text-gray-600 mb-8 leading-relaxed">
          {description}
        </p>
        <div className="space-y-4">
          <ActionButton />
          {children}
        </div>
      </div>
    </div>
  )
}