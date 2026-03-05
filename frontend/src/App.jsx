import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import { DataProvider } from './context/DataContext'

function App() {
  return (
    <DataProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </DataProvider>
  )
}

export default App
