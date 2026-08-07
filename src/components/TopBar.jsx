import { useAuth } from '../context/AuthContext'

const NOMBRE_ROL = {
  secretaria: 'Secretaría',
  gerencia: 'Gerencia',
  profesional: 'Profesional',
}

export default function TopBar() {
  const { usuario, logout } = useAuth()
  return (
    <div className="topbar">
      <div className="brand">
        <span className="eye-dot" />
        OFTALMÓVIL
        {usuario?.rol && <span className="role-pill">{NOMBRE_ROL[usuario.rol] || usuario.rol}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>{usuario?.nombre || usuario?.email}</span>
        <button className="logout-btn" onClick={logout}>Salir</button>
      </div>
    </div>
  )
}
