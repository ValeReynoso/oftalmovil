export function calcularEdad(fechaNacimientoISO) {
  if (!fechaNacimientoISO) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimientoISO + 'T00:00:00')
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--
  }
  return edad
}
