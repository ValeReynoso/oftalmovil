import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import TopBar from './components/TopBar'
import Login from './pages/Login'
import SecretariaPage from './pages/SecretariaPage'
import ProfesionalPage from './pages/ProfesionalPage'
import GerenciaPage from './pages/GerenciaPage'
import HistoriaClinicaPage from './pages/HistoriaClinicaPage'
import CaptacionPage from './pages/CaptacionPage'
import InstitucionPage from './pages/InstitucionPage'

function Shell({ children }) {
  return (
    <div className="app-shell">
      <TopBar />
      {children}
    </div>
  )
}

function InicioSegunRol() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <div className="page">Cargando...</div>
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol === 'secretaria') return <Navigate to="/secretaria" replace />
  if (usuario.rol === 'profesional') return <Navigate to="/profesional" replace />
  if (usuario.rol === 'gerencia') return <Navigate to="/gerencia" replace />
  if (usuario.rol === 'captacion') return <Navigate to="/captacion" replace />
  return (
    <div className="page">
      <div className="card">
        <h2>Sin rol asignado</h2>
        <p>Tu usuario todavía no tiene un rol. Contactá a Gerencia para que te lo asigne.</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/" element={<Shell><InicioSegunRol /></Shell>} />
          <Route path="/secretaria" element={
            <Shell>
              <ProtectedRoute rolesPermitidos={['secretaria']}>
                <SecretariaPage />
              </ProtectedRoute>
            </Shell>
          } />
          <Route path="/profesional" element={
            <Shell>
              <ProtectedRoute rolesPermitidos={['profesional']}>
                <ProfesionalPage />
              </ProtectedRoute>
            </Shell>
          } />
          <Route path="/gerencia" element={
            <Shell>
              <ProtectedRoute rolesPermitidos={['gerencia']}>
                <GerenciaPage />
              </ProtectedRoute>
            </Shell>
          } />
          <Route path="/pacientes/:dni" element={
            <Shell>
              <ProtectedRoute rolesPermitidos={['secretaria', 'profesional', 'gerencia']}>
                <HistoriaClinicaPage />
              </ProtectedRoute>
            </Shell>
          } />
          <Route path="/captacion" element={
            <Shell>
              <ProtectedRoute rolesPermitidos={['captacion']}>
                <CaptacionPage />
              </ProtectedRoute>
            </Shell>
          } />
          <Route path="/instituciones/:id" element={
            <Shell>
              <ProtectedRoute rolesPermitidos={['captacion', 'gerencia']}>
                <InstitucionPage />
              </ProtectedRoute>
            </Shell>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function LoginRoute() {
  const { usuario, cargando } = useAuth()
  if (!cargando && usuario) return <Navigate to="/" replace />
  return <Login />
}
