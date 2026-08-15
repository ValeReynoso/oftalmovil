import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collectionGroup, collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { calcularPuntualidad } from '../utils/puntualidad'
import { ESTADOS_INSTITUCION_POSITIVOS } from '../utils/constants'

export default function GerenciaPage() {
  const [vista, setVista] = useState('consultas')

  return (
    <div className="page">
      <div className="page-header">
        <h1>Panel de Gerencia</h1>
        <p>Vista completa de consultas, estadísticas del servicio y captación institucional.</p>
      </div>

      <div className="filters-row" style={{ marginBottom: 24 }}>
        <button type="button" className={`btn ${vista === 'consultas' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setVista('consultas')}>
          Consultas a domicilio
        </button>
        <button type="button" className={`btn ${vista === 'captacion' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setVista('captacion')}>
          Captación institucional
        </button>
      </div>

      {vista === 'consultas' ? <VistaConsultas /> : <VistaCaptacion />}
    </div>
  )
}

function VistaConsultas() {
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
    <>
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
      {filtradas.map((v) => {
        const puntualidad = calcularPuntualidad(v.fechaHoraVisita, v.horaInicioReal)
        return (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {puntualidad && <span className={`badge ${puntualidad.clase}`}>{puntualidad.texto}</span>}
              <span className={`badge ${v.estado === 'realizada' ? 'badge-done' : 'badge-pending'}`}>
                {v.estado === 'realizada' ? 'Realizada' : 'Pendiente'}
              </span>
            </div>
          </div>
        )
      })}
    </>
  )
}

function VistaCaptacion() {
  const navigate = useNavigate()
  const [instituciones, setInstituciones] = useState([])
  const [contactos, setContactos] = useState([])
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroLocalidad, setFiltroLocalidad] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'instituciones'), (snap) => {
      setInstituciones(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }, (err) => console.error('Error cargando instituciones:', err))
    return unsub
  }, [])

  useEffect(() => {
    // Sin orderBy ni where: un collectionGroup "a secas" no necesita índice
    // compuesto, así que agrupamos y ordenamos todo del lado del cliente.
    const unsub = onSnapshot(collectionGroup(db, 'contactos'), (snap) => {
      setContactos(snap.docs.map((d) => ({ id: d.id, institucionId: d.ref.parent.parent.id, ...d.data() })))
    }, (err) => console.error('Error cargando contactos:', err))
    return unsub
  }, [])

  const localidadesUnicas = useMemo(
    () => [...new Set(instituciones.map((i) => i.localidad).filter(Boolean))],
    [instituciones]
  )

  const filtradas = useMemo(() => instituciones.filter((i) => {
    if (filtroPrioridad && i.prioridad !== filtroPrioridad) return false
    if (filtroLocalidad && i.localidad !== filtroLocalidad) return false
    return true
  }), [instituciones, filtroPrioridad, filtroLocalidad])

  const idsFiltradas = useMemo(() => new Set(filtradas.map((i) => i.id)), [filtradas])
  const contactosFiltrados = useMemo(
    () => contactos.filter((c) => idsFiltradas.has(c.institucionId)),
    [contactos, idsFiltradas]
  )

  const stats = useMemo(() => computarStatsCaptacion(filtradas, contactosFiltrados), [filtradas, contactosFiltrados])

  return (
    <>
      <div className="stat-grid">
        <StatCard num={filtradas.length} label="Instituciones" />
        <StatCard num={stats.interesadas} label="Interesadas o con jornada" />
        <StatCard num={stats.vencidas.length} label="Seguimientos vencidos" />
        <StatCard num={stats.totalPotenciales} label="Pacientes potenciales estimados" />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Instituciones por estado</h2>
        <BarList datos={stats.porEstado} total={filtradas.length} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Instituciones por prioridad</h2>
        <BarList datos={stats.porPrioridad} total={filtradas.length} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Instituciones por localidad</h2>
        <BarList datos={stats.porLocalidad} total={filtradas.length} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Contactos registrados por mes</h2>
        <BarList datos={stats.contactosPorMes} total={contactosFiltrados.length} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Pacientes potenciales estimados por estado</h2>
        <BarList datos={stats.potencialesPorEstado} total={stats.totalPotenciales} />
      </div>

      <div className="page-header" style={{ marginTop: 10 }}>
        <h1 style={{ fontSize: '1.15rem' }}>Instituciones</h1>
      </div>

      <div className="filters-row">
        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
          <option value="">Todas las prioridades</option>
          <option value="A">Prioridad A</option>
          <option value="B">Prioridad B</option>
        </select>
        <select value={filtroLocalidad} onChange={(e) => setFiltroLocalidad(e.target.value)}>
          <option value="">Todas las localidades</option>
          {localidadesUnicas.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: 10 }}>Seguimiento vencido ({stats.vencidas.length})</h2>
      {stats.vencidas.length === 0 && <div className="empty-state">No hay seguimientos vencidos.</div>}
      {stats.vencidas.map((i) => (
        <div key={i.id} className="list-item" onClick={() => navigate(`/instituciones/${i.id}`)}>
          <div className="li-main">
            <strong>{i.nombre}</strong>
            <div>
              {i.localidad} · Prioridad {i.prioridad} · Próxima acción: {i.fechaProximaAccion.toDate().toLocaleDateString('es-AR')}
            </div>
          </div>
          <span className="badge badge-pending">Vencida</span>
        </div>
      ))}
    </>
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

function computarStatsCaptacion(instituciones, contactos) {
  const porEstado = {}
  const porPrioridad = {}
  const porLocalidad = {}
  const potencialesPorEstado = {}
  let interesadas = 0
  let totalPotenciales = 0
  const ahora = Date.now()

  for (const i of instituciones) {
    const estado = i.estadoActual || 'Sin contactar'
    porEstado[estado] = (porEstado[estado] || 0) + 1
    if (i.prioridad) porPrioridad[`Prioridad ${i.prioridad}`] = (porPrioridad[`Prioridad ${i.prioridad}`] || 0) + 1
    if (i.localidad) porLocalidad[i.localidad] = (porLocalidad[i.localidad] || 0) + 1
    if (ESTADOS_INSTITUCION_POSITIVOS.includes(estado)) interesadas++
    if (i.pacientesPotencialesEstimados) {
      totalPotenciales += i.pacientesPotencialesEstimados
      potencialesPorEstado[estado] = (potencialesPorEstado[estado] || 0) + i.pacientesPotencialesEstimados
    }
  }

  const vencidas = instituciones
    .filter((i) => i.fechaProximaAccion?.toMillis && i.fechaProximaAccion.toMillis() <= ahora)
    .sort((a, b) => a.fechaProximaAccion.toMillis() - b.fechaProximaAccion.toMillis())

  const contactosPorMes = {}
  for (const c of contactos) {
    if (!c.fecha?.toDate) continue
    const etiqueta = c.fecha.toDate().toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
    contactosPorMes[etiqueta] = (contactosPorMes[etiqueta] || 0) + 1
  }

  return { porEstado, porPrioridad, porLocalidad, potencialesPorEstado, interesadas, totalPotenciales, vencidas, contactosPorMes }
}
