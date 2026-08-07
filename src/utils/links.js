// Todos estos links funcionan sin OAuth ni APIs pagas: simplemente abren
// la app correspondiente (o la web) con los datos precargados.

function pad(n) { return String(n).padStart(2, '0') }

// Formato requerido por el link de Google Calendar: YYYYMMDDTHHMMSS (hora local)
function formatFechaGCal(date) {
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    '00'
  )
}

export function linkGoogleCalendar({ paciente, fechaHoraVisita, motivo, domicilio, duracionMin = 30 }) {
  const inicio = new Date(fechaHoraVisita)
  const fin = new Date(inicio.getTime() + duracionMin * 60000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `OFTALMÓVIL - Consulta a domicilio: ${paciente}`,
    dates: `${formatFechaGCal(inicio)}/${formatFechaGCal(fin)}`,
    details: `Paciente: ${paciente}\nMotivo: ${motivo}`,
    location: domicilio || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function linkGoogleMaps(domicilio) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(domicilio || '')}`
}

function soloDigitos(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

export function linkWhatsapp(telefono) {
  const digitos = soloDigitos(telefono)
  return `https://wa.me/${digitos}`
}

export function linkLlamada(telefono) {
  return `tel:${soloDigitos(telefono)}`
}
