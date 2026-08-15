import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { TIPOS_INSTITUCION, PRIORIDADES_INSTITUCION } from '../utils/constants'
import { claseBadgeEstadoInstitucion } from '../utils/estadoInstitucion'

const INSTITUCION_VACIA = {
  nombre: '', tipo: TIPOS_INSTITUCION[0], direccion: '', localidad: '',
  telefono: '', whatsapp: '', mail: '', responsableInstitucion: '',
  prioridad: PRIORIDADES_INSTITUCION[0], pacientesPotencialesEstimados: '',
}

export default function CaptacionPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [instituciones, setInstituciones] = useState([])
  const [form, setForm] = useState(INSTITUCION_VACIA)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'instituciones'), (snap) => {
      setInstituciones(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }, (err) => {
      console.error('Error cargando instituciones:', err)
    })
    return unsub
  }, [])

  function actualizarCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    setMensaje('')
    if (!form.nombre || !form.direccion || !form.localidad) {
      setErrorMsg('Completá al menos nombre, dirección y localidad.')
      return
    }
    setGuardando(true)
    try {
      await addDoc(collection(db, 'instituciones'), {
        nombre: form.nombre,
        tipo: form.tipo,
        direccion: form.direccion,
        localidad: form.localidad,
        telefono: form.telefono,
        whatsapp: form.whatsapp,
        mail: form.mail,
        responsableInstitucion: form.responsableInstitucion,
        prioridad: form.prioridad,
        pacientesPotencialesEstimados: form.pacientesPotencialesEstimados ? Number(form.pacientesPotencialesEstimados) : null,
        estadoActual: 'Sin contactar',
        proximaAccion: '',
        fechaProximaAccion: null,
        responsableCaptacionId: usuario.uid,
        responsableCaptacionNombre: usuario.nombre || usuario.email,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      })
      setMensaje('Institución cargada correctamente.')
      setForm(INSTITUCION_VACIA)
    } catch (err) {
      console.error(err)
      setErrorMsg('Ocurrió un error al guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const filtradas = useMemo(() => {
    const ahora = Date.now()
    return instituciones
      .filter((i) => !filtroPrioridad || i.prioridad === filtroPrioridad)
      .filter((i) => !filtroEstado || i.estadoActual === filtroEstado)
      .sort((a, b) => {
        const fa = a.fechaProximaAccion?.toMillis ? a.fechaProximaAccion.toMillis() : Infinity
        const fb = b.fechaProximaAccion?.toMillis ? b.fechaProximaAccion.toMillis() : Infinity
        const aVencida = fa <= ahora
        const bVencida = fb <= ahora
        if (aVencida !== bVencida) return aVencida ? -1 : 1
        return fa - fb
      })
  }, [instituciones, filtroPrioridad, filtroEstado])

  const estadosPresentes = useMemo(
    () => [...new Set(instituciones.map((i) => i.estadoActual).filter(Boolean))],
    [instituciones]
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1>Captación institucional</h1>
        <p>Instituciones contactadas para presentar OFTALMÓVIL y coordinar jornadas o derivaciones.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Nueva institución</h2>
          <div className="field-row">
            <div className="field">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} required />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => actualizarCampo('tipo', e.target.value)}>
                {TIPOS_INSTITUCION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Dirección</label>
              <input value={form.direccion} onChange={(e) => actualizarCampo('direccion', e.target.value)} required />
            </div>
            <div className="field">
              <label>Localidad</label>
              <input value={form.localidad} onChange={(e) => actualizarCampo('localidad', e.target.value)} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Teléfono</label>
              <input value={form.telefono} onChange={(e) => actualizarCampo('telefono', e.target.value)} />
            </div>
            <div className="field">
              <label>WhatsApp (opcional, si es distinto del teléfono)</label>
              <input value={form.whatsapp} onChange={(e) => actualizarCampo('whatsapp', e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Mail (opcional)</label>
              <input type="email" value={form.mail} onChange={(e) => actualizarCampo('mail', e.target.value)} />
            </div>
            <div className="field">
              <label>Responsable en la institución (opcional)</label>
              <input value={form.responsableInstitucion} onChange={(e) => actualizarCampo('responsableInstitucion', e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Prioridad</label>
              <select value={form.prioridad} onChange={(e) => actualizarCampo('prioridad', e.target.value)}>
                {PRIORIDADES_INSTITUCION.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Pacientes potenciales estimados (opcional)</label>
              <input type="number" min="0" value={form.pacientesPotencialesEstimados} onChange={(e) => actualizarCampo('pacientesPotencialesEstimados', e.target.value)} />
            </div>
          </div>

          {errorMsg && <div className="error-text" style={{ marginBottom: 12 }}>{errorMsg}</div>}
          {mensaje && <div className="hint">{mensaje}</div>}

          <button className="btn btn-accent" type="submit" disabled={guardando} style={{ marginTop: 10 }}>
            {guardando ? 'Guardando...' : 'Cargar institución'}
          </button>
        </div>
      </form>

      <div className="page-header" style={{ marginTop: 36 }}>
        <h1 style={{ fontSize: '1.2rem' }}>Instituciones ({filtradas.length})</h1>
      </div>

      <div className="filters-row">
        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
          <option value="">Todas las prioridades</option>
          {PRIORIDADES_INSTITUCION.map((p) => <option key={p} value={p}>Prioridad {p}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {estadosPresentes.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {filtradas.length === 0 && <div className="empty-state">No hay instituciones que coincidan con los filtros.</div>}
      {filtradas.map((i) => (
        <ItemInstitucion key={i.id} institucion={i} onClick={() => navigate(`/instituciones/${i.id}`)} />
      ))}
    </div>
  )
}

function ItemInstitucion({ institucion: i, onClick }) {
  const ahora = Date.now()
  const vencida = i.fechaProximaAccion?.toMillis && i.fechaProximaAccion.toMillis() <= ahora
  const fechaTexto = i.fechaProximaAccion?.toDate
    ? i.fechaProximaAccion.toDate().toLocaleDateString('es-AR')
    : null

  return (
    <div className="list-item" onClick={onClick}>
      <div className="li-main">
        <strong>{i.nombre}</strong>
        <div>
          {i.tipo} · {i.localidad} · Prioridad {i.prioridad}
          {fechaTexto ? ` · Próxima acción: ${fechaTexto}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {vencida && <span className="badge badge-pending">Vencida</span>}
        <span className={`badge ${claseBadgeEstadoInstitucion(i.estadoActual)}`}>{i.estadoActual || 'Sin contactar'}</span>
      </div>
    </div>
  )
}
