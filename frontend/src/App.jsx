import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import { DataProvider } from './context/DataContext'
import { isDemo, isDemoExpired } from './config/demo'
import DemoExpiredGate from './components/DemoExpiredGate'

function App() {
  // If demo mode and expired — block everything
  if (isDemo() && isDemoExpired()) {
    return <DemoExpiredGate />
  }

  return (
    <DataProvider>
      <Routes>
        {/* In demo mode, skip landing page — go straight to dashboard with sample data */}
        <Route path="/" element={isDemo() ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </DataProvider>
  )
}

export default App
