import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useSetup } from './hooks/useSetup'
import Layout from './components/Layout'
import Home from './pages/Home'
import CreateModel from './pages/CreateModel'
import Detection from './pages/Detection'
import Models from './pages/Models'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Register from './pages/Register'
import Learn from './pages/Learn'
import FirstTimeSetup from './components/FirstTimeSetup'

function App() {
  const { token } = useAuth()
  const { setupStatus, loading } = useSetup()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (setupStatus?.requiresSetup) {
    return <FirstTimeSetup onComplete={() => window.location.reload()} />
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateModel />} />
        <Route path="/detection/:modelId" element={<Detection />} />
        <Route path="/models" element={<Models />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/:modelId" element={<Learn />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App