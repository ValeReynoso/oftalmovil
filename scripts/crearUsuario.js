// Da de alta un usuario del sistema: lo crea en Firebase Authentication y
// le crea la ficha correspondiente en usuarios/{uid} con su rol.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/service-account.json \
//     node scripts/crearUsuario.js --email persona@oftalmovil.com \
//     --nombre "Nombre Apellido" --rol captacion --password "contraseñaProvisoria"
//
// rol debe ser uno de: secretaria | profesional | gerencia | captacion
//
// Alternativa sin este script: Firebase Console → Authentication → Add user,
// y después crear a mano el documento en usuarios/{uid} (ver README).

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const ROLES_VALIDOS = ['secretaria', 'profesional', 'gerencia', 'captacion']

function leerArgs() {
  const args = {}
  for (let i = 2; i < process.argv.length; i += 2) {
    const clave = process.argv[i].replace(/^--/, '')
    args[clave] = process.argv[i + 1]
  }
  return args
}

const { email, nombre, rol, password } = leerArgs()

if (!email || !nombre || !rol || !password) {
  console.error('Faltan argumentos. Uso: node scripts/crearUsuario.js --email <email> --nombre "<nombre>" --rol <rol> --password "<password>"')
  process.exit(1)
}
if (!ROLES_VALIDOS.includes(rol)) {
  console.error(`Rol inválido: "${rol}". Tiene que ser uno de: ${ROLES_VALIDOS.join(', ')}`)
  process.exit(1)
}

const credencialesPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credencialesPath) {
  console.error('Falta GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la service account.')
  process.exit(1)
}
const serviceAccount = JSON.parse(readFileSync(credencialesPath, 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const auth = getAuth()
const db = getFirestore()

async function crear() {
  const usuario = await auth.createUser({ email, password, displayName: nombre })
  await db.collection('usuarios').doc(usuario.uid).set({ nombre, email, rol })
  console.log(`Usuario creado: ${email} (uid: ${usuario.uid}, rol: ${rol})`)
}

crear().catch((err) => {
  console.error(err)
  process.exit(1)
})
