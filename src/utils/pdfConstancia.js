import jsPDF from 'jspdf'
import { calcularEdad } from './age'

const NAVY = [12, 13, 67]
const VIOLET = [88, 62, 165]
const GRAY = [107, 110, 133]

export function generarConstanciaPDF(visita) {
  const doc = new jsPDF()
  const marginX = 20
  let y = 22

  // Encabezado
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  doc.text('OFTALMÓVIL', marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...VIOLET)
  doc.text('Atención oftalmológica domiciliaria', marginX, y + 6)

  y += 16
  doc.setDrawColor(...VIOLET)
  doc.setLineWidth(0.6)
  doc.line(marginX, y, 190, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...NAVY)
  doc.text('Constancia de Visita Domiciliaria', marginX, y)
  y += 12

  const edad = calcularEdad(visita.pacienteFechaNacimiento)

  y = seccion(doc, y, marginX, 'Datos del paciente', [
    ['Nombre y Apellido', visita.pacienteNombre || '-'],
    ['DNI', visita.pacienteDni || '-'],
    ...(edad !== null && !Number.isNaN(edad) ? [['Edad', `${edad} años`]] : []),
    ['Domicilio', visita.pacienteDomicilio || '-'],
    ['Teléfono', visita.pacienteTelefono || '-'],
    ...(visita.pacienteOrigen ? [['Origen', visita.pacienteOrigen]] : []),
  ])

  y = seccion(doc, y, marginX, 'Datos de la visita', [
    ['Fecha y hora', (visita.fechaHoraVisita || '-').replace('T', ' ')],
    ['Motivo de consulta', visita.motivoConsulta + (visita.motivoObservacion ? ` — ${visita.motivoObservacion}` : '')],
    ['Profesional interviniente', visita.profesionalNombre || '-'],
  ])

  if (visita.estado === 'realizada') {
    let destinoTexto = visita.destinoPaciente || '-'
    if (visita.destinoPaciente === 'Coordinar nueva visita en Domicilio' && visita.destinoDias) {
      destinoTexto += ` (control en ${visita.destinoDias} días)`
    }
    if (visita.destinoPaciente === 'Derivación a Clínica' && visita.destinoDerivacion?.length) {
      destinoTexto += `: ${visita.destinoDerivacion.join(', ')}`
    }

    y = seccion(doc, y, marginX, 'Resultado de la visita', [
      ['Resultado', visita.resultadoVisita + (visita.resultadoObservacion ? ` — ${visita.resultadoObservacion}` : '')],
      ['Destino del paciente', destinoTexto],
    ])
  } else {
    y = seccion(doc, y, marginX, 'Resultado de la visita', [
      ['Estado', 'Visita aún pendiente de realizar'],
    ])
  }

  // Pie
  const fechaGeneracion = new Date().toLocaleString('es-AR')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(`Documento generado automáticamente por el sistema OFTALMÓVIL el ${fechaGeneracion}.`, marginX, 285)

  const nombreArchivo = `Constancia_${(visita.pacienteNombre || 'paciente').replace(/\s+/g, '_')}_${(visita.fechaHoraVisita || '').slice(0, 10)}.pdf`
  doc.save(nombreArchivo)
}

function seccion(doc, yInicial, marginX, titulo, filas) {
  let y = yInicial
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...VIOLET)
  doc.text(titulo, marginX, y)
  y += 7

  doc.setDrawColor(226, 228, 239)
  doc.setLineWidth(0.3)

  filas.forEach(([etiqueta, valor]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text(`${etiqueta}:`, marginX, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    const lineas = doc.splitTextToSize(String(valor), 118)
    doc.text(lineas, marginX + 55, y)
    y += 6 * lineas.length
  })

  y += 6
  return y
}
