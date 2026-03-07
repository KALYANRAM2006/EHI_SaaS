import { useState, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import { DataProvider, useData } from './context/DataContext'
import { isDemo, isDemoExpired } from './config/demo'
import DemoExpiredGate from './components/DemoExpiredGate'
import GuidedTour, { TourStartButton } from './components/GuidedTour'
import { DemoExpiryBanner } from './components/DemoExpiredGate'

function AppContent() {
  const [showTour, setShowTour] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { loadSampleData } = useData()
  const demoMode = isDemo()

  // Auto-start the tour after a short delay when the demo landing page loads
  const handleDemoTourStart = useCallback(() => {
    if (demoMode && !showTour) {
      setTimeout(() => setShowTour(true), 600)
    }
  }, [demoMode, showTour])

  // Handle tour step actions — supports page navigation + view switching
  const handleTourStepAction = useCallback((action) => {
    if (action.navigate) {
      // Navigate to a different page
      if (action.navigate === '/dashboard') {
        // Load sample data before navigating to dashboard
        loadSampleData()
      }
      navigate(action.navigate)
    }
    // View switching is handled by Dashboard internally via custom event
    if (action.view) {
      window.dispatchEvent(new CustomEvent('tour-switch-view', { detail: action.view }))
    }
  }, [navigate, loadSampleData])

  return (
    <>
      <Routes>
        {/* In demo mode, show landing page with tour — no auto-redirect */}
        <Route path="/" element={<LandingPage onDemoReady={handleDemoTourStart} />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>

      {/* Tour and demo UI at app level so it spans across pages */}
      {demoMode && (
        <>
          <GuidedTour
            active={showTour}
            onEnd={() => setShowTour(false)}
            onStepAction={handleTourStepAction}
          />
          {!showTour && <TourStartButton onClick={() => setShowTour(true)} />}
          <DemoExpiryBanner />
        </>
      )}
    </>
  )
}

function App() {
  // If demo mode and expired — block everything
  if (isDemo() && isDemoExpired()) {
    return <DemoExpiredGate />
  }

  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}

export default App
