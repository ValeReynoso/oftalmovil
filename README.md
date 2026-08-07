# OFTALMÓVIL — Sistema de gestión de consultas domiciliarias

App web (React + Firebase) para coordinar y hacer seguimiento de las
consultas oftalmológicas a domicilio, con 3 roles: Secretaría, Profesional
y Gerencia.

## 1. Conectar tu proyecto de Firebase

1. Copiá el archivo `.env.example` a `.env`:
   ```
   cp .env.example .env
   ```
2. Completá `.env` con los valores del `firebaseConfig` que te dio Firebase
   al registrar la app web (los mismos que me pasaste por chat).

## 2. Instalar y correr en modo desarrollo

```
npm install
npm run dev
```

Se abre en `http://localhost:5173`. Vas a ver la pantalla de login (todavía
no va a poder entrar nadie hasta el paso 4).

## 3. Publicar las reglas e índices de Firestore

Esto es lo que hace que cada rol solo pueda ver/editar lo que le corresponde
(Secretaría carga, Profesional solo ve y resuelve lo suyo, Gerencia ve todo).

Necesitás [Firebase CLI](https://firebase.google.com/docs/cli) instalado una vez:
```
npm install -g firebase-tools
firebase login
firebase init firestore   # elegí "usar un proyecto existente" → tu proyecto oftalmovil
                           # cuando pregunte por firestore.rules / firestore.indexes.json,
                           # decile que SÍ a usar los que ya están en esta carpeta (no los sobrescribas)
firebase deploy --only firestore:rules,firestore:indexes
```

Alternativa sin instalar nada: entrá a Firebase Console → Firestore Database →
pestaña "Reglas", pegá el contenido de `firestore.rules` y publicá. Los
índices de `firestore.indexes.json` se crean solos la primera vez que cada
pantalla haga esa consulta: Firestore te va a tirar en la consola del
navegador un link que dice "para esta consulta hace falta un índice, hacé
clic acá para crearlo" — cliqueás y esperás 1-2 minutos.

## 4. Crear los primeros usuarios (Secretaría, Profesional, Gerencia)

Como decidimos que los usuarios se crean desde cero (no hay auto-registro),
por ahora se cargan a mano desde la consola de Firebase. Para cada persona:

1. **Firebase Console → Authentication → Users → Add user.** Cargá su email
   y una contraseña provisoria. Al guardar, Firebase te muestra un **UID**
   (algo como `aBc123XyZ...`) — copialo.
2. **Firebase Console → Firestore Database → colección `usuarios`.**
   Creá un documento con **ID = ese mismo UID**, y estos campos:
   - `nombre` (string): nombre visible, ej. "Dra. María Andrioli"
   - `email` (string): el mismo email del paso 1
   - `rol` (string): `secretaria`, `profesional` o `gerencia` (todo en
     minúscula, tal cual)

Repetí esto por cada persona que vaya a usar el sistema. Después puedo
armarte una pantalla dentro de Gerencia para hacer esto sin entrar a la
consola de Firebase, si te sirve.

## 5. Desplegar en Vercel

1. Subí esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → "Add New Project" → importá el repo.
3. En "Environment Variables" cargá las mismas 6 variables de tu `.env`
   (`VITE_FIREBASE_API_KEY`, etc.).
4. Deploy. Vercel detecta que es un proyecto Vite automáticamente.
5. Los celulares acceden a la URL que te da Vercel (funciona como PWA básica
   desde el navegador; si más adelante querés ícono + "instalar app" te
   agrego el manifest).

## Estructura del modelo de datos (Firestore)

```
usuarios/{uid}                → nombre, email, rol
pacientes/{dni}                → nombreApellido, dni, fechaNacimiento, domicilio, telefono, origenPaciente
  └─ visitas/{autoId}          → fechaHoraVisita, motivoConsulta, motivoObservacion,
                                  profesionalUid, profesionalNombre, estado (pendiente|realizada),
                                  resultadoVisita, resultadoObservacion,
                                  destinoPaciente, destinoDias, destinoDerivacion[],
                                  creadoPor, fechaCreacion
```

Cada paciente (identificado por DNI) tiene su ficha con historial de todas
sus visitas, como una historia clínica.

## Qué falta / próximos pasos posibles

- Notificación push o por correo al profesional cuando se le deriva una
  consulta (lo dejamos afuera del MVP por complejidad, se puede sumar con
  Firebase Cloud Messaging o un trigger de Cloud Functions que mande un mail).
- Pantalla de Gerencia para alta de usuarios sin pasar por la consola de Firebase.
- Manifest PWA para "instalar" la app en el celular con ícono propio.
