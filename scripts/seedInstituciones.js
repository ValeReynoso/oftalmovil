// Precarga las instituciones relevadas en la planilla
// "Oftalmovil_Instituciones_Seguimiento" (hoja "Instituciones").
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/service-account.json node scripts/seedInstituciones.js
//
// Requiere una service account con permiso de escritura sobre Firestore en
// el proyecto oftalmovil-andrioli. Usa el Admin SDK (bypassa firestore.rules)
// porque este script corre una sola vez y no hay todavía ningún usuario con
// rol "captacion" logueado en la app para hacerlo desde la UI.
//
// Ninguna institución de la planilla tenía contactos reales registrados
// (todas estaban "Sin contactar"), así que este script sólo crea la ficha
// de la institución — no inventa ningún documento en la subcolección
// contactos. El primer contacto real lo carga la persona de Captación
// desde la app.

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const credencialesPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credencialesPath) {
  console.error('Falta GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la service account.')
  process.exit(1)
}
const serviceAccount = JSON.parse(readFileSync(credencialesPath, 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// Datos tal cual figuran en la planilla. "tipo" se normalizó al menú fijo
// que usa la app (Residencia geriátrica | Centro de día |
// Residencia / neurogeriatría | Otro); el resto de los campos se copió
// literal. Los campos que la planilla no completó (responsableInstitucion,
// pacientesPotencialesEstimados, fechaProximaAccion) quedan vacíos/null,
// tal como haría el formulario de alta si se dejan en blanco.
const instituciones = [
  {
    prioridad: 'A',
    nombre: 'Institución Gerontológica Dr. Valderrama',
    tipo: 'Residencia / neurogeriatría',
    direccion: 'Gdor. Vera 3893',
    localidad: 'Santa Fe',
    telefono: '0342 482-7679',
    whatsapp: '342 441-1088',
    mail: 'administracion@puertoneurociencias.com',
  },
  {
    prioridad: 'A',
    nombre: 'Los Tilos Residencia para Adultos Mayores',
    tipo: 'Residencia geriátrica',
    direccion: 'Padre Genesio 1238',
    localidad: 'Santa Fe',
    telefono: '0342 469-8634',
    whatsapp: '',
    mail: '',
  },
  {
    prioridad: 'A',
    nombre: 'Residencia Geriátrica El Encuentro',
    tipo: 'Residencia geriátrica',
    direccion: '4 de Enero 1961',
    localidad: 'Santa Fe',
    telefono: '0342 459-8949 / 458-2567',
    whatsapp: '',
    mail: '',
  },
  {
    prioridad: 'A',
    nombre: 'Solar Guadalupe',
    tipo: 'Residencia geriátrica',
    direccion: 'Pavón 133',
    localidad: 'Santa Fe',
    telefono: '0342 419-1912',
    whatsapp: '0342 419-1912',
    mail: 'residenciasolarguadalupe@gmail.com',
  },
  {
    prioridad: 'A',
    nombre: 'Casa de Mayores - Jerárquicos Salud',
    tipo: 'Residencia geriátrica',
    direccion: 'Ruta 11 Km 456',
    localidad: 'Sauce Viejo',
    telefono: '0342 499-6018',
    whatsapp: '',
    mail: '',
  },
  {
    prioridad: 'A',
    nombre: 'Los Portales SRL / Portal del Sol',
    tipo: 'Residencia / neurogeriatría',
    direccion: 'Hipólito Yrigoyen 3763',
    localidad: 'Santa Fe',
    telefono: '0342 454-1972',
    whatsapp: '',
    mail: '',
  },
  {
    prioridad: 'A',
    nombre: 'EMAUS Residencia para Adultos Mayores',
    tipo: 'Residencia geriátrica',
    direccion: 'Alvear 4640',
    localidad: 'Santa Fe',
    telefono: '0342 559-0901',
    whatsapp: '',
    mail: '',
  },
  {
    prioridad: 'B',
    nombre: 'La Residencia de Juanita Rozek',
    tipo: 'Residencia geriátrica',
    direccion: '25 de Mayo 1967',
    localidad: 'Santa Fe',
    telefono: '0342 458-2012',
    whatsapp: '',
    mail: '',
  },
  {
    prioridad: 'B',
    nombre: 'Sagrado Corazón de Jesús Residencia Geriátrica',
    tipo: 'Residencia geriátrica',
    direccion: 'Pedro Ferré 3347',
    localidad: 'Santa Fe',
    telefono: '0342 455-5373',
    whatsapp: '',
    mail: '',
  },
  {
    prioridad: 'B',
    nombre: 'La Posada del Labriego',
    tipo: 'Residencia geriátrica',
    direccion: 'L. Paganini 2443',
    localidad: 'San José del Rincón',
    telefono: '0342 497-1634',
    whatsapp: '342 509-5095',
    mail: 'eduardobaracca@gmail.com',
  },
  {
    prioridad: 'B',
    nombre: 'Pilares Centro de Día para Adultos Mayores',
    tipo: 'Centro de día',
    direccion: 'Monseñor Zaspe 3463 PA',
    localidad: 'Santa Fe',
    telefono: '0342 412-0571',
    whatsapp: '342 441-1511',
    mail: '',
  },
  {
    prioridad: 'B',
    nombre: 'Centro de Acción de Movimientos Comunitarios (CAMCO)',
    tipo: 'Centro de día',
    direccion: 'Entre Ríos 2670',
    localidad: 'Santa Fe',
    telefono: '0342 412-1276',
    whatsapp: '',
    mail: '',
  },
]

async function seed() {
  const coleccion = db.collection('instituciones')
  for (const inst of instituciones) {
    const existente = await coleccion.where('nombre', '==', inst.nombre).limit(1).get()
    if (!existente.empty) {
      console.log(`Ya existe, se salta: ${inst.nombre}`)
      continue
    }
    await coleccion.add({
      ...inst,
      responsableInstitucion: '',
      estadoActual: 'Sin contactar',
      proximaAccion: 'Llamar / WhatsApp',
      fechaProximaAccion: null,
      pacientesPotencialesEstimados: null,
      responsableCaptacionId: '',
      responsableCaptacionNombre: '',
      creadoEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
    })
    console.log(`Creada: ${inst.nombre}`)
  }
  console.log('Listo.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
