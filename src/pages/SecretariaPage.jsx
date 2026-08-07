import { useEffect, useState } from 'react'
import {
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp,
  collectionGroup, query, orderBy, limit, onSnapshot, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useProfesionales } from '../hooks/useProfesionales'
import { calcularEdad } from '../utils/age'
import { MOTIVOS_CONSULTA, ORIGENES_PACIENTE } from '../utils/constants'

const PACIENTE_VACIO = {
  nombreApellido: '', dni: '', fechaNacimiento: '', domicilio: '', telefono: '', origenPaciente: ORIGENES_PACIENTE[0],
}

export default function SecretariaPage() {
  const { usuario } = useAuth()
  const { profesionales } = useProfesionales()

  const [dniBusqueda, setDniBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [pacienteEncontrado, setPacienteEncontrado] = useState(null) // null = todavía no se buscó / no existe
  const [paciente, setPaciente] = useState(PACIENTE_VACIO)

  const [fechaVisita, setFechaVisita] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS_CONSULTA[0])
  const [motivoObs, setMotivoObs] = useState('')
  const [profesionalUid, setProfesionalUid] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [recientes, setRecientes] = useState([])
  const [eliminandoId, setEliminandoId] = useState(null)

  useEffect(() => {
    const q = query(collectionGroup(db, 'visitas'), orderBy('fechaCreacion', 'desc'), limit(15))
    const unsub = onSnapshot(q, (snap) => {
      setRecientes(snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() })))
    }, (err) => {
      console.error('Error cargando consultas recientes:', err)
    })
    return unsub
  }, [])

  async function eliminarConsulta(v) {
    const confirmar = window.confirm(
      `¿Eliminar la consulta de ${v.pacienteNombre} (${v.fechaHoraVisita?.replace('T', ' ')})? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return
    setEliminandoId(v.id)
    try {
      await deleteDoc(v.ref)
    } catch (err) {
      console.error(err)
      alert('No se pudo eliminar la consulta. Probá de nuevo.')
    } finally {
      setEliminandoId(null)
    }
  }

  async function buscarPaciente() {
    if (!dniBusqueda.trim()) return
    setBuscando(true)
    setMensaje('')
    setErrorMsg('')
    try {
      const ref = doc(db, 'pacientes', dniBusqueda.trim())
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setPacienteEncontrado(true)
        setPaciente({ ...snap.data(), dni: dniBusqueda.trim() })
      } else {
        setPacienteEncontrado(false)
        setPaciente({ ...PACIENTE_VACIO, dni: dniBusqueda.trim() })
      }
    } finally {
      setBuscando(false)
    }
  }

  function actualizarCampo(campo, valor) {
    setPaciente((p) => ({ ...p, [campo]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    setMensaje('')
    if (!paciente.dni || !paciente.nombreApellido) {
      setErrorMsg('Completá al menos DNI y Nombre y Apellido del paciente.')
      return
    }
    if (!fechaVisita || !profesionalUid) {
      setErrorMsg('Falta la fecha/hora de la visita o el profesional asignado.')
      return
    }
    const profesional = profesionales.find((p) => p.uid === profesionalUid)
    setGuardando(true)
    try {
      const pacienteRef = doc(db, 'pacientes', paciente.dni)
      await setDoc(pacienteRef, {
        nombreApellido: paciente.nombreApellido,
        dni: paciente.dni,
        fechaNacimiento: paciente.fechaNacimiento,
        domicilio: paciente.domicilio,
        telefono: paciente.telefono,
        origenPaciente: paciente.origenPaciente,
        actualizadoEn: serverTimestamp(),
        ...(pacienteEncontrado ? {} : { creadoEn: serverTimestamp() }),
      }, { merge: true })

      await addDoc(collection(db, 'pacientes', paciente.dni, 'visitas'), {
        pacienteDni: paciente.dni,
        pacienteNombre: paciente.nombreApellido,
        pacienteDomicilio: paciente.domicilio,
        pacienteTelefono: paciente.telefono,
        pacienteOrigen: paciente.origenPaciente,
        pacienteFechaNacimiento: paciente.fechaNacimiento,
        fechaHoraVisita: fechaVisita,
        motivoConsulta: motivo,
        motivoObservacion: motivo === 'Otro' ? motivoObs : '',
        profesionalUid,
        profesionalNombre: profesional?.nombre || '',
        estado: 'pendiente',
        creadoPor: usuario.uid,
        creadoPorNombre: usuario.nombre || usuario.email,
        fechaCreacion: serverTimestamp(),
      })

      setMensaje('Consulta coordinada y derivada correctamente.')
      setPaciente(PACIENTE_VACIO)
      setDniBusqueda('')
      setPacienteEncontrado(null)
      setFechaVisita('')
      setMotivo(MOTIVOS_CONSULTA[0])
      setMotivoObs('')
      setProfesionalUid('')
    } catch (err) {
      console.error(err)
      setErrorMsg('Ocurrió un error al guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const edad = calcularEdad(paciente.fechaNacimiento)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Nueva consulta</h1>
        <p>Cargá la ficha del paciente y coordiná la visita a domicilio.</p>
      </div>

      <div className="card">
        <div className="field">
          <label>Buscar paciente existente por DNI</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={dniBusqueda} onChange={(e) => setDniBusqueda(e.target.value)} placeholder="Ej: 30123456" />
            <button type="button" className="btn btn-outline" onClick={buscarPaciente} disabled={buscando}>
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {pacienteEncontrado === true && <div className="hint">Paciente encontrado: se actualizará su ficha existente.</div>}
          {pacienteEncontrado === false && <div className="hint">No existe todavía: se creará una ficha nueva.</div>}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Datos del paciente</h2>
          <div className="field-row">
            <div className="field">
              <label>Nombre y Apellido</label>
              <input value={paciente.nombreApellido} onChange={(e) => actualizarCampo('nombreApellido', e.target.value)} required />
            </div>
            <div className="field">
              <label>DNI</label>
              <input value={paciente.dni} onChange={(e) => actualizarCampo('dni', e.target.value)} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Fecha de Nacimiento</label>
              <input type="date" value={paciente.fechaNacimiento} onChange={(e) => actualizarCampo('fechaNacimiento', e.target.value)} required />
              {edad !== null && !Number.isNaN(edad) && <div className="hint">Edad actual: {edad} años</div>}
            </div>
            <div className="field">
              <label>Teléfono de Contacto</label>
              <input value={paciente.telefono} onChange={(e) => actualizarCampo('telefono', e.target.value)} placeholder="Ej: 3425123456" required />
            </div>
          </div>
          <div className="field">
            <label>Domicilio</label>
            <input value={paciente.domicilio} onChange={(e) => actualizarCampo('domicilio', e.target.value)} placeholder="Calle, número, ciudad" required />
          </div>
          <div className="field">
            <label>Origen del Paciente</label>
            <select value={paciente.origenPaciente} onChange={(e) => actualizarCampo('origenPaciente', e.target.value)}>
              {ORIGENES_PACIENTE.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Visita coordinada</h2>
          <div className="field-row">
            <div className="field">
              <label>Fecha y hora de la visita</label>
              <input type="datetime-local" value={fechaVisita} onChange={(e) => setFechaVisita(e.target.value)} required />
            </div>
            <div className="field">
              <label>Motivo de la consulta</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS_CONSULTA.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {motivo === 'Otro' && (
            <div className="field">
              <label>Observación del motivo</label>
              <textarea rows={2} value={motivoObs} onChange={(e) => setMotivoObs(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label>Derivar a Profesional</label>
            <select value={profesionalUid} onChange={(e) => setProfesionalUid(e.target.value)} required>
              <option value="">Seleccionar profesional...</option>
              {profesionales.map((p) => <option key={p.uid} value={p.uid}>{p.nombre || p.email}</option>)}
            </select>
            {profesionales.length === 0 && <div className="hint">No hay usuarios con rol Profesional cargados todavía.</div>}
          </div>
        </div>

        {errorMsg && <div className="error-text" style={{ marginBottom: 12 }}>{errorMsg}</div>}
        {mensaje && <div className="card" style={{ background: 'var(--success-bg)', border: 'none', color: 'var(--success)', fontWeight: 600 }}>{mensaje}</div>}

        <button className="btn btn-accent" type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Coordinar y derivar consulta'}
        </button>
      </form>

      <div className="page-header" style={{ marginTop: 36 }}>
        <h1 style={{ fontSize: '1.2rem' }}>Últimas consultas coordinadas</h1>
      </div>
      {recientes.length === 0 && <div className="empty-state">Todavía no se coordinaron consultas.</div>}
      {recientes.map((v) => (
        <div key={v.id} className="list-item" style={{ cursor: 'default' }}>
          <div className="li-main">
            <strong>{v.pacienteNombre}</strong>
            <div>{v.motivoConsulta} · Derivado a {v.profesionalNombre} · {v.fechaHoraVisita?.replace('T', ' ')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge ${v.estado === 'realizada' ? 'badge-done' : 'badge-pending'}`}>
              {v.estado === 'realizada' ? 'Realizada' : 'Pendiente'}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => eliminarConsulta(v)}
              disabled={eliminandoId === v.id}
            >
              {eliminandoId === v.id ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
