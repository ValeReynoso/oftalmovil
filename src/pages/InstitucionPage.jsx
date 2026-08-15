import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, onSnapshot, collection, query, orderBy,
  writeBatch, serverTimestamp, Timestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { linkGoogleMaps, linkWhatsapp, linkLlamada, linkMail } from '../utils/links'
import {
  TIPOS_INSTITUCION, PRIORIDADES_INSTITUCION, TIPOS_CONTACTO, RESULTADOS_CONTACTO,
} from '../utils/constants'
import { claseBadgeEstadoInstitucion } from '../utils/estadoInstitucion'

function ahoraLocalInput() {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function InstitucionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const puedeEditar = usuario?.rol === 'captacion'

  const [institucion, setInstitucion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [contactos, setContactos] = useState([])
  const [editando, setEditando] = useState(false)
  const [mostrarFormContacto, setMostrarFormContacto] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'instituciones', id), (snap) => {
      setInstitucion(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setCargando(false)
    }, (err) => {
      console.error('Error cargando institución:', err)
      setCargando(false)
    })
    return unsub
  }, [id])

  useEffect(() => {
    const q = query(collection(db, 'instituciones', id, 'contactos'), orderBy('fecha', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setContactos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }, (err) => {
      console.error('Error cargando contactos:', err)
    })
    return unsub
  }, [id])

  if (cargando) return <div className="page"><span className="loading-dot" /> Cargando...</div>

  return (
    <div className="page">
      <button className="btn btn-outline" onClick={() => navigate('/captacion')} style={{ marginBottom: 16 }}>&larr; Volver al listado</button>

      {!institucion ? (
        <div className="card"><p>No se encontró la institución.</p></div>
      ) : editando ? (
        <FormEditarInstitucion institucion={institucion} onCancelar={() => setEditando(false)} onGuardado={() => setEditando(false)} />
      ) : (
        <div className="card">
          <div className="page-header" style={{ marginBottom: 10 }}>
            <h1 style={{ fontSize: '1.3rem' }}>{institucion.nombre}</h1>
            <span className={`badge ${claseBadgeEstadoInstitucion(institucion.estadoActual)}`} style={{ marginTop: 6 }}>{institucion.estadoActual || 'Sin contactar'}</span>
          </div>

          <div className="field-row">
            <div><strong>Tipo:</strong> {institucion.tipo}</div>
            <div><strong>Prioridad:</strong> {institucion.prioridad}</div>
          </div>
          <div className="field-row">
            <div><strong>Dirección:</strong> {institucion.direccion}</div>
            <div><strong>Localidad:</strong> {institucion.localidad}</div>
          </div>
          {institucion.responsableInstitucion && (
            <div style={{ marginTop: 8 }}><strong>Responsable en la institución:</strong> {institucion.responsableInstitucion}</div>
          )}
          {institucion.pacientesPotencialesEstimados != null && (
            <div style={{ marginTop: 8 }}><strong>Pacientes potenciales estimados:</strong> {institucion.pacientesPotencialesEstimados}</div>
          )}
          {institucion.proximaAccion && (
            <div style={{ marginTop: 8 }}>
              <strong>Próxima acción:</strong> {institucion.proximaAccion}
              {institucion.fechaProximaAccion?.toDate ? ` (${institucion.fechaProximaAccion.toDate().toLocaleDateString('es-AR')})` : ''}
            </div>
          )}

          <div className="action-row">
            {institucion.direccion && (
              <a className="btn btn-outline" target="_blank" rel="noreferrer" href={linkGoogleMaps(institucion.direccion)}>Abrir en Maps</a>
            )}
            {institucion.telefono && (
              <a className="btn btn-outline" href={linkLlamada(institucion.telefono)}>Llamar</a>
            )}
            {(institucion.whatsapp || institucion.telefono) && (
              <a className="btn btn-outline" target="_blank" rel="noreferrer" href={linkWhatsapp(institucion.whatsapp || institucion.telefono)}>WhatsApp</a>
            )}
            {institucion.mail && (
              <a className="btn btn-outline" href={linkMail(institucion.mail)}>Mail</a>
            )}
            {puedeEditar && (
              <button type="button" className="btn btn-outline" onClick={() => setEditando(true)}>Editar datos</button>
            )}
          </div>
        </div>
      )}

      {institucion && puedeEditar && !editando && (
        <div className="card">
          {mostrarFormContacto ? (
            <FormRegistrarContacto institucionId={id} onCancelar={() => setMostrarFormContacto(false)} onGuardado={() => setMostrarFormContacto(false)} />
          ) : (
            <button type="button" className="btn btn-accent" onClick={() => setMostrarFormContacto(true)}>Registrar contacto</button>
          )}
        </div>
      )}

      <div className="page-header" style={{ marginTop: 30 }}>
        <h1 style={{ fontSize: '1.15rem' }}>Historial de contactos ({contactos.length})</h1>
      </div>

      {contactos.length === 0 && <div className="empty-state">Todavía no se registraron contactos con esta institución.</div>}
      {contactos.map((c) => (
        <div key={c.id} className="card">
          <div className="page-header" style={{ marginBottom: 10 }}>
            <h1 style={{ fontSize: '1.05rem' }}>
              {c.fecha?.toDate ? c.fecha.toDate().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </h1>
            <span className={`badge ${claseBadgeEstadoInstitucion(c.resultado)}`} style={{ marginTop: 6 }}>{c.resultado}</span>
          </div>
          <div><strong>Tipo de contacto:</strong> {c.tipoContacto}</div>
          {c.pacientesPotenciales != null && <div style={{ marginTop: 6 }}><strong>Pacientes potenciales:</strong> {c.pacientesPotenciales}</div>}
          {c.proximoPaso && (
            <div style={{ marginTop: 6 }}>
              <strong>Próximo paso:</strong> {c.proximoPaso}
              {c.fechaProximaAccion?.toDate ? ` (${c.fechaProximaAccion.toDate().toLocaleDateString('es-AR')})` : ''}
            </div>
          )}
          {c.observaciones && <div style={{ marginTop: 6 }}><strong>Observaciones:</strong> {c.observaciones}</div>}
          <div className="hint" style={{ marginTop: 8 }}>Registrado por {c.registradoPorNombre || '-'}</div>
        </div>
      ))}
    </div>
  )
}

function FormEditarInstitucion({ institucion, onCancelar, onGuardado }) {
  const [form, setForm] = useState({
    nombre: institucion.nombre || '',
    tipo: institucion.tipo || TIPOS_INSTITUCION[0],
    direccion: institucion.direccion || '',
    localidad: institucion.localidad || '',
    telefono: institucion.telefono || '',
    whatsapp: institucion.whatsapp || '',
    mail: institucion.mail || '',
    responsableInstitucion: institucion.responsableInstitucion || '',
    prioridad: institucion.prioridad || PRIORIDADES_INSTITUCION[0],
  })
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function actualizarCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function guardar(e) {
    e.preventDefault()
    setErrorMsg('')
    if (!form.nombre || !form.direccion || !form.localidad) {
      setErrorMsg('Completá al menos nombre, dirección y localidad.')
      return
    }
    setGuardando(true)
    try {
      await updateDoc(doc(db, 'instituciones', institucion.id), {
        ...form,
        actualizadoEn: serverTimestamp(),
      })
      onGuardado()
    } catch (err) {
      console.error(err)
      setErrorMsg('No se pudo guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="card" onSubmit={guardar}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Editar datos de la institución</h2>
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
          <label>WhatsApp (opcional)</label>
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
      <div className="field">
        <label>Prioridad</label>
        <select value={form.prioridad} onChange={(e) => actualizarCampo('prioridad', e.target.value)}>
          {PRIORIDADES_INSTITUCION.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {errorMsg && <div className="error-text" style={{ marginBottom: 12 }}>{errorMsg}</div>}
      <div className="action-row">
        <button className="btn btn-accent" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}

function FormRegistrarContacto({ institucionId, onCancelar, onGuardado }) {
  const { usuario } = useAuth()
  const [fecha, setFecha] = useState(ahoraLocalInput())
  const [tipoContacto, setTipoContacto] = useState(TIPOS_CONTACTO[0])
  const [resultado, setResultado] = useState(RESULTADOS_CONTACTO[0])
  const [pacientesPotenciales, setPacientesPotenciales] = useState('')
  const [proximoPaso, setProximoPaso] = useState('')
  const [fechaProximaAccion, setFechaProximaAccion] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function guardar(e) {
    e.preventDefault()
    setErrorMsg('')
    if (!fecha) {
      setErrorMsg('Falta la fecha del contacto.')
      return
    }
    setGuardando(true)
    try {
      const batch = writeBatch(db)
      const contactoRef = doc(collection(db, 'instituciones', institucionId, 'contactos'))
      const fechaProximaAccionTs = fechaProximaAccion ? Timestamp.fromDate(new Date(`${fechaProximaAccion}T00:00:00`)) : null
      const pacientesPotencialesNum = pacientesPotenciales ? Number(pacientesPotenciales) : null

      batch.set(contactoRef, {
        fecha: Timestamp.fromDate(new Date(fecha)),
        tipoContacto,
        resultado,
        pacientesPotenciales: pacientesPotencialesNum,
        proximoPaso,
        fechaProximaAccion: fechaProximaAccionTs,
        observaciones,
        registradoPor: usuario.uid,
        registradoPorNombre: usuario.nombre || usuario.email,
        creadoEn: serverTimestamp(),
      })
      batch.update(doc(db, 'instituciones', institucionId), {
        estadoActual: resultado,
        proximaAccion: proximoPaso,
        fechaProximaAccion: fechaProximaAccionTs,
        pacientesPotencialesEstimados: pacientesPotencialesNum,
        actualizadoEn: serverTimestamp(),
      })
      await batch.commit()
      onGuardado()
    } catch (err) {
      console.error(err)
      setErrorMsg('No se pudo guardar el contacto. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Registrar contacto</h2>
      <div className="field-row">
        <div className="field">
          <label>Fecha y hora</label>
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
        <div className="field">
          <label>Tipo de contacto</label>
          <select value={tipoContacto} onChange={(e) => setTipoContacto(e.target.value)}>
            {TIPOS_CONTACTO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Resultado</label>
          <select value={resultado} onChange={(e) => setResultado(e.target.value)}>
            {RESULTADOS_CONTACTO.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Pacientes potenciales (opcional)</label>
          <input type="number" min="0" value={pacientesPotenciales} onChange={(e) => setPacientesPotenciales(e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Próximo paso (opcional)</label>
          <input value={proximoPaso} onChange={(e) => setProximoPaso(e.target.value)} placeholder="Ej: Llamar para coordinar jornada" />
        </div>
        <div className="field">
          <label>Fecha de próxima acción (opcional)</label>
          <input type="date" value={fechaProximaAccion} onChange={(e) => setFechaProximaAccion(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Observaciones (opcional)</label>
        <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      {errorMsg && <div className="error-text" style={{ marginBottom: 12 }}>{errorMsg}</div>}
      <div className="action-row">
        <button className="btn btn-accent" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar contacto'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
