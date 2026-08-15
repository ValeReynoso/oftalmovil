import { calcularPuntualidad, formatearHoraReal } from '../utils/puntualidad'

export default function PuntualidadInfo({ visita }) {
  if (!visita.horaInicioReal) return null
  const puntualidad = calcularPuntualidad(visita.fechaHoraVisita, visita.horaInicioReal)
  return (
    <div style={{ marginTop: 8 }}>
      <strong>Hora de atención real:</strong> {formatearHoraReal(visita.horaInicioReal)}
      {puntualidad && (
        <span className={`badge ${puntualidad.clase}`} style={{ marginLeft: 8 }}>{puntualidad.texto}</span>
      )}
    </div>
  )
}
