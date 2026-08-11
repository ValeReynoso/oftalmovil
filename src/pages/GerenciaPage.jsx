import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collectionGroup, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function GerenciaPage() {
  const navigate = useNavigate()
  const [visitas, setVisitas] = useState([])
  const [filtroProfesional, setFiltroProfesional] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  useEffect(() => {
    const q = query(collectionGroup(db, 'visitas'), orderBy('fechaHoraVisita', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setVisitas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const profesionalesUnicos = useMemo(
    () => [...new Set(visitas.map((v) => v.profesionalNombre).filter(Boolean))],
    [visitas]
  )

  const filtradas = useMemo(() => visitas.filter((v) => {
    if (filtroProfesional && v.profesionalNombre !== filtroProfesional) return false
    if (filtroEstado && v.estado !== filtroEstado) return false
    if (filtroDesde && v.fechaHoraVisita < filtroDesde) return false
    if (filtroHasta && v.fechaHoraVisita > filtroHasta) return false
    return true
  }), [visitas, filtroProfesional, filtroEstado, filtroDesde, filtroHasta])

  const stats = useMemo(() => computarStats(filtradas), [filtradas])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Panel de Gerencia</h1>
        <p>Vista completa de consultas y estadísticas del servicio.</p>
      </div>

      <div className="stat-grid">
        <StatCard num={filtradas.length} label="Consultas totales" />
        <StatCard num={stats.pendientes} label="Pendientes" />
        <StatCard num={stats.realizadas} label="Realizadas" />
        <StatCard num={`${stats.tasaDerivacion}%`} label="Derivadas a clínica" />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Visitas por profesional</h2>
        <BarList datos={stats.porProfesional} total={filtradas.length} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Motivos de consulta más frecuentes</h2>
        <BarList datos={stats.porMotivo} total={filtradas.length} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Origen del paciente</h2>
        <BarList datos={stats.porOrigen} total={filtradas.length} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Zonas geográficas (por domicilio cargado)</h2>
        <BarList datos={stats.porZona} total={filtradas.length} />
      </div>

      <div className="page-header" style={{ marginTop: 10 }}>
        <h1 style={{ fontSize: '1.15rem' }}>Consultas</h1>
      </div>

      <div className="filters-row">
        <select value={filtroProfesional} onChange={(e) => setFiltroProfesional(e.target.value)}>
          <option value="">Todos los profesionales</option>
          {profesionalesUnicos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="realizada">Realizada</option>
        </select>
        <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
        <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
      </div>

      {filtradas.length === 0 && <div className="empty-state">No hay consultas que coincidan con los filtros.</div>}
      {filtradas.map((v) => (
        <div key={v.id} className="list-item" style={{ cursor: 'default' }}>
          <div className="li-main">
            <button
              type="button"
              className="patient-name-link"
              onClick={() => navigate(`/pacientes/${v.pacienteDni}`)}
              title="Ver historia clínica completa de este paciente"
            >
              {v.pacienteNombre}
            </button>
            <div>
              {v.motivoConsulta} · Prof: {v.profesionalNombre} · {v.fechaHoraVisita?.replace('T', ' ')}
              {v.estado === 'realizada' && v.resultadoVisita ? ` · ${v.resultadoVisita}` : ''}
            </div>
          </div>
          <span className={`badge ${v.estado === 'realizada' ? 'badge-done' : 'badge-pending'}`}>
            {v.estado === 'realizada' ? 'Realizada' : 'Pendiente'}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ num, label }) {
  return (
    <div className="stat-card">
      <div className="num">{num}</div>
      <div className="label">{label}</div>
    </div>
  )
}

function BarList({ datos, total }) {
  const entradas = Object.entries(datos).sort((a, b) => b[1] - a[1])
  if (entradas.length === 0) return <div className="hint">Sin datos todavía.</div>
  const max = Math.max(...entradas.map(([, v]) => v))
  return entradas.map(([nombre, cantidad]) => (
    <div className="bar-row" key={nombre}>
      <div className="bar-label" title={nombre}>{nombre}</div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${(cantidad / max) * 100}%` }} /></div>
      <div className="bar-val">{cantidad}</div>
    </div>
  ))
}

function computarStats(visitas) {
  const porProfesional = {}
  const porMotivo = {}
  const porOrigen = {}
  const porZona = {}
  let pendientes = 0, realizadas = 0, derivadasClinica = 0

  for (const v of visitas) {
    if (v.profesionalNombre) porProfesional[v.profesionalNombre] = (porProfesional[v.profesionalNombre] || 0) + 1
    if (v.motivoConsulta) porMotivo[v.motivoConsulta] = (porMotivo[v.motivoConsulta] || 0) + 1
    if (v.pacienteOrigen || v.origenPaciente) {
      const o = v.pacienteOrigen || v.origenPaciente
      porOrigen[o] = (porOrigen[o] || 0) + 1
    }
    if (v.pacienteDomicilio) {
      const zona = extraerZona(v.pacienteDomicilio)
      porZona[zona] = (porZona[zona] || 0) + 1
    }
    if (v.estado === 'realizada') {
      realizadas++
      if (v.destinoPaciente === 'Derivación a Clínica') derivadasClinica++
    } else {
      pendientes++
    }
  }

  const tasaDerivacion = realizadas > 0 ? Math.round((derivadasClinica / realizadas) * 100) : 0

  return { porProfesional, porMotivo, porOrigen, porZona, pendientes, realizadas, tasaDerivacion }
}

function extraerZona(domicilio) {
  // Heurística simple: toma el último segmento separado por coma (suele ser la localidad/barrio).
  const partes = domicilio.split(',').map((p) => p.trim()).filter(Boolean)
  return partes.length > 1 ? partes[partes.length - 1] : domicilio
}
