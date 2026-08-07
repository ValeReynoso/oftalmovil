import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null) // { uid, email, nombre, rol }
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUsuario(null)
        setCargando(false)
        return
      }
      try {
        const perfilRef = doc(db, 'usuarios', firebaseUser.uid)
        const perfilSnap = await getDoc(perfilRef)
        if (perfilSnap.exists()) {
          setUsuario({ uid: firebaseUser.uid, email: firebaseUser.email, ...perfilSnap.data() })
        } else {
          // El usuario existe en Auth pero no tiene ficha en /usuarios: no tiene rol asignado.
          setUsuario({ uid: firebaseUser.uid, email: firebaseUser.email, rol: null })
        }
      } catch (e) {
        console.error('Error cargando perfil de usuario', e)
        setUsuario({ uid: firebaseUser.uid, email: firebaseUser.email, rol: null })
      }
      setCargando(false)
    })
    return unsub
  }, [])

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
