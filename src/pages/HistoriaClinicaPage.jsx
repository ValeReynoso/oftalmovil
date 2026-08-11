import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { calcularEdad } from '../utils/age'
import { generarConstanciaPDF } from '../utils/pdfConstancia'

export default function HistoriaClinicaPage() {
  const { dni } = useParams()
  const navigate = useNavigate()

  const [paciente, setPaciente] = useState(null)
  const [cargandoPaciente, setCargandoPaciente] = useState(true)
  const [visitas, setVisitas] = useState([])
  const [cargandoVisitas, setCargandoVisitas] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    setCargandoPaciente(true)
    setError('')
    getDoc(doc(db, 'pacientes', dni))
      .then((snap) => {
        if (!activo) return
        setPaciente(snap.exists() ? { ...snap.data(), dni } : null)
      })
      .catch((err) => {
        console.error('Error cargando paciente:', err)
        if (activo) setError('No se pudo cargar la ficha del paciente.')
      })
      .finally(() => { if (activo) setCargandoPaciente(false) })
    return () => { activo = false }
  }, [dni])

  useEffect(() => {
    const q = query(collection(db, 'pacientes', dni, 'visitas'), orderBy('fechaHoraVisita', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setVisitas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setCargandoVisitas(false)
    }, (err) => {
      console.error('Error cargando historial de visitas:', err)
      setError('No se pudo cargar el historial de visitas.')
      setCargandoVisitas(false)
    })
    return unsub
  }, [dni])

  const edad = calcularEdad(paciente?.fechaNacimiento)

  return (
    <div className="page">
      <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>&larr; Volver</button>

      <div className="page-header">
        <h1>Historia Clínica del Paciente</h1>
        <p>Historial completo de consultas registradas para este paciente.</p>
      </div>

      {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

      {cargandoPaciente ? (
        <div className="card"><span className="loading-dot" /> Cargando datos del paciente...</div>
      ) : paciente ? (
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>{paciente.nombreApellido}</h2>
          <div className="field-row">
            <div><strong>DNI:</strong> {paciente.dni}</div>
            {edad !== null && !Number.isNaN(edad) && <div><strong>Edad:</strong> {edad} años</div>}
          </div>
          <div className="field-row">
            <div><strong>Domicilio:</strong> {paciente.domicilio}</div>
            <div><strong>Teléfono:</strong> {paciente.telefono}</div>
          </div>
          {paciente.origenPaciente && <div style={{ marginTop: 8 }}><strong>Origen:</strong> {paciente.origenPaciente}</div>}
        </div>
      ) : (
        <div className="card">
          <p>No se encontró una ficha para el DNI <strong>{dni}</strong>.</p>
        </div>
      )}

      <div className="page-header" style={{ marginTop: 30 }}>
        <h1 style={{ fontSize: '1.15rem' }}>Visitas ({visitas.length})</h1>
      </div>

      {cargandoVisitas && <div className="card"><span className="loading-dot" /> Cargando visitas...</div>}
      {!cargandoVisitas && visitas.length === 0 && (
        <div className="empty-state">Este paciente todavía no tiene visitas registradas.</div>
      )}

      {visitas.map((v) => (
        <VisitaCard key={v.id} visita={v} />
      ))}
    </div>
  )
}

function VisitaCard({ visita }) {
  let destinoTexto = visita.destinoPaciente || ''
  if (visita.destinoPaciente === 'Coordinar nueva visita en Domicilio' && visita.destinoDias) {
    destinoTexto += ` (control en ${visita.destinoDias} días)`
  }
  if (visita.destinoPaciente === 'Derivación a Clínica' && visita.destinoDerivacion?.length) {
    destinoTexto += `: ${visita.destinoDerivacion.join(', ')}`
  }

  return (
    <div className="card">
      <div className="page-header" style={{ marginBottom: 10 }}>
        <h1 style={{ fontSize: '1.05rem' }}>{visita.fechaHoraVisita?.replace('T', ' ')}</h1>
        <span className={`badge ${visita.estado === 'realizada' ? 'badge-done' : 'badge-pending'}`} style={{ marginTop: 6 }}>
          {visita.estado === 'realizada' ? 'Realizada' : 'Pendiente'}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <strong>Motivo:</strong> {visita.motivoConsulta}
        {visita.motivoObservacion ? ` — ${visita.motivoObservacion}` : ''}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Profesional:</strong> {visita.profesionalNombre || '-'}
      </div>

      {visita.estado === 'realizada' ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <strong>Resultado:</strong> {visita.resultadoVisita}
            {visita.resultadoObservacion ? ` — ${visita.resultadoObservacion}` : ''}
          </div>
          <div><strong>Destino del paciente:</strong> {destinoTexto}</div>

          <div className="action-row">
            <button type="button" className="btn btn-primary" onClick={() => generarConstanciaPDF(visita)}>
              Descargar Constancia (PDF)
            </button>
          </div>
        </>
      ) : (
        <div className="hint">El profesional todavía no realizó esta visita.</div>
      )}
    </div>
  )
}
