const TOLERANCIA_MIN = 10

export function calcularPuntualidad(fechaHoraVisitaISO, horaInicioReal) {
  if (!fechaHoraVisitaISO || !horaInicioReal) return null
  const programada = new Date(fechaHoraVisitaISO)
  const real = typeof horaInicioReal.toDate === 'function' ? horaInicioReal.toDate() : new Date(horaInicioReal)
  const diffMin = Math.round((real - programada) / 60000)

  if (diffMin <= TOLERANCIA_MIN) {
    return { texto: 'Llegó a tiempo', clase: 'badge-done' }
  }
  return { texto: `Llegó con demora (${diffMin} min)`, clase: 'badge-pending' }
}

export function formatearHoraReal(horaInicioReal) {
  if (!horaInicioReal) return ''
  const real = typeof horaInicioReal.toDate === 'function' ? horaInicioReal.toDate() : new Date(horaInicioReal)
  return real.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
