import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export function useProfesionales() {
  const [profesionales, setProfesionales] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'profesional'))
    const unsub = onSnapshot(q, (snap) => {
      setProfesionales(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
      setCargando(false)
    })
    return unsub
  }, [])

  return { profesionales, cargando }
}
