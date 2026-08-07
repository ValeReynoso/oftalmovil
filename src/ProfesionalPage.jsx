import { useEffect, useState } from 'react'
import { collectionGroup, query, where, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { calcularEdad } from '../utils/age'
import { linkGoogleCalendar, linkGoogleMaps, linkWhatsapp, linkLlamada } from '../utils/links'
import { generarConstanciaPDF } from '../utils/pdfConstancia'
import { RESULTADOS_VISITA, DESTINOS_PACIENTE, OPCIONES_DERIVACION_CLINICA } from '../utils/constants'

export default function ProfesionalPage() {
  const { usuario } = useAuth()
  const [visitas, setVisitas] = useState([])
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    if (!usuario?.uid) return
    const q = query(collectionGroup(db, 'visitas'), where('profesionalUid', '==', usuario.uid))
    const unsub = onSnapshot(q, (snap) => {
      const datos = snap.docs
        .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))
        .sort((a, b) => (a.fechaHoraVisita < b.fechaHoraVisita ? 1 : -1))
      setVisitas(datos)
      if (seleccionada) {
        const actualizada = datos.find((v) => v.id === seleccionada.id)
        if (actualizada) setSeleccionada(actualizada)
      }
    }, (err) => {
      console.error('Error cargando mis consultas:', err)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.uid])

  if (seleccionada) {
    return <DetalleVisita visita={seleccionada} onVolver={() => setSeleccionada(null)} />
  }

  const pendientes = visitas.filter((v) => v.estado !== 'realizada')
  const realizadas = visitas.filter((v) => v.estado === 'realizada')

  return (
    <div className="page">
      <div className="page-header">
        <h1>Mis consultas</h1>
        <p>Consultas a domicilio derivadas a vos.</p>
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: 10 }}>Pendientes ({pendientes.length})</h2>
      {pendientes.length === 0 && <div className="empty-state">No tenés consultas pendientes.</div>}
      {pendientes.map((v) => (
        <ItemVisita key={v.id} v={v} onClick={() => setSeleccionada(v)} />
      ))}

      {realizadas.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', margin: '26px 0 10px' }}>Realizadas ({realizadas.length})</h2>
          {realizadas.map((v) => (
            <ItemVisita key={v.id} v={v} onClick={() => setSeleccionada(v)} />
          ))}
        </>
      )}
    </div>
  )
}

function ItemVisita({ v, onClick }) {
  return (
    <div className="list-item" onClick={onClick}>
      <div className="li-main">
        <strong>{v.pacienteNombre}</strong>
        <div>{v.motivoConsulta} · {v.fechaHoraVisita?.replace('T', ' ')}</div>
      </div>
      <span className={`badge ${v.estado === 'realizada' ? 'badge-done' : 'badge-pending'}`}>
        {v.estado === 'realizada' ? 'Realizada' : 'Pendiente'}
      </span>
    </div>
  )
}

function DetalleVisita({ visita, onVolver }) {
  const [resultado, setResultado] = useState(visita.resultadoVisita || RESULTADOS_VISITA[0])
  const [resultadoObs, setResultadoObs] = useState(visita.resultadoObservacion || '')
  const [destino, setDestino] = useState(visita.destinoPaciente || DESTINOS_PACIENTE[0])
  const [dias, setDias] = useState(visita.destinoDias || '')
  const [derivacion, setDerivacion] = useState(visita.destinoDerivacion || [])
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const edad = calcularEdad(visita.pacienteFechaNacimiento)

  function toggleDerivacion(op) {
    setDerivacion((d) => (d.includes(op) ? d.filter((x) => x !== op) : [...d, op]))
  }

  async function guardarResultado(e) {
    e.preventDefault()
    setErrorMsg('')
    if (destino === 'Derivación a Clínica' && derivacion.length === 0) {
      setErrorMsg('Seleccioná al menos una opción de derivación a clínica.')
      return
    }
    setGuardando(true)
    try {
      await updateDoc(visita.ref, {
        resultadoVisita: resultado,
        resultadoObservacion: resultado === 'Otro Diagnóstico' ? resultadoObs : '',
        destinoPaciente: destino,
        destinoDias: destino === 'Coordinar nueva visita en Domicilio' ? dias : '',
        destinoDerivacion: destino === 'Derivación a Clínica' ? derivacion : [],
        estado: 'realizada',
        fechaRealizacion: serverTimestamp(),
      })
      onVolver()
    } catch (err) {
      console.error(err)
      setErrorMsg('No se pudo guardar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="page">
      <button className="btn btn-outline" onClick={onVolver} style={{ marginBottom: 16 }}>&larr; Volver al listado</button>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 10 }}>
          <h1 style={{ fontSize: '1.3rem' }}>{visita.pacienteNombre}</h1>
          <p>
            {visita.motivoConsulta}
            {visita.motivoObservacion ? ` — ${visita.motivoObservacion}` : ''} · Visita: {visita.fechaHoraVisita?.replace('T', ' ')}
          </p>
        </div>
        <div className="field-row">
          <div><strong>Domicilio:</strong> {visita.pacienteDomicilio}</div>
          <div><strong>Teléfono:</strong> {visita.pacienteTelefono}</div>
        </div>
        <div className="field-row">
          {edad !== null && !Number.isNaN(edad) && <div><strong>Edad:</strong> {edad} años</div>}
          {visita.pacienteOrigen && <div><strong>Origen:</strong> {visita.pacienteOrigen}</div>}
        </div>

        <div className="action-row">
          <a className="btn btn-primary" target="_blank" rel="noreferrer" href={linkGoogleCalendar({
            paciente: visita.pacienteNombre,
            fechaHoraVisita: visita.fechaHoraVisita,
            motivo: visita.motivoConsulta,
            domicilio: visita.pacienteDomicilio,
          })}>Agregar a Calendar</a>
          <a className="btn btn-outline" target="_blank" rel="noreferrer" href={linkGoogleMaps(visita.pacienteDomicilio)}>Abrir en Maps</a>
          <a className="btn btn-outline" target="_blank" rel="noreferrer" href={linkWhatsapp(visita.pacienteTelefono)}>WhatsApp</a>
          <a className="btn btn-outline" href={linkLlamada(visita.pacienteTelefono)}>Llamar</a>
          {visita.estado === 'realizada' && (
            <button type="button" className="btn btn-outline" onClick={() => generarConstanciaPDF(visita)}>
              Descargar Constancia (PDF)
            </button>
          )}
        </div>
      </div>

      <form className="card" onSubmit={guardarResultado}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: 14 }}>Cargar resultado de la visita</h2>

        <div className="field">
          <label>Resultado de la visita</label>
          <select value={resultado} onChange={(e) => setResultado(e.target.value)}>
            {RESULTADOS_VISITA.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {resultado === 'Otro Diagnóstico' && (
          <div className="field">
            <label>Observación</label>
            <textarea rows={2} value={resultadoObs} onChange={(e) => setResultadoObs(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label>Destino del paciente</label>
          <select value={destino} onChange={(e) => setDestino(e.target.value)}>
            {DESTINOS_PACIENTE.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {destino === 'Coordinar nueva visita en Domicilio' && (
          <div className="field">
            <label>Control en cuántos días</label>
            <input type="number" min="1" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Ej: 15" />
          </div>
        )}

        {destino === 'Derivación a Clínica' && (
          <div className="field">
            <label>Motivo de derivación</label>
            <div className="option-tiles">
              {OPCIONES_DERIVACION_CLINICA.map((op) => {
                const seleccionado = derivacion.includes(op)
                return (
                  <label className={`option-tile ${seleccionado ? 'is-selected' : ''}`} key={op}>
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => toggleDerivacion(op)}
                      style={{ display: 'none' }}
                    />
                    <span className="option-tile-check">
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="option-tile-label">{op}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {errorMsg && <div className="error-text">{errorMsg}</div>}
        <button className="btn btn-accent" type="submit" disabled={guardando} style={{ marginTop: 10 }}>
          {guardando ? 'Guardando...' : 'Guardar resultado de la visita'}
        </button>
      </form>
    </div>
  )
}
