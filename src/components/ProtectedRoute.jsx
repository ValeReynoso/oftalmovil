import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ rolesPermitidos, children }) {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return <div className="page"><span className="loading-dot" /> Cargando...</div>
  }
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  if (!usuario.rol || !rolesPermitidos.includes(usuario.rol)) {
    return (
      <div className="page">
        <div className="card">
          <h2>Sin acceso</h2>
          <p>Tu usuario todavía no tiene un rol asignado, o no tiene permiso para ver esta sección. Contactá a Gerencia.</p>
        </div>
      </div>
    )
  }
  return children
}
