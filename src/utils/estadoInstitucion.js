import { ESTADOS_INSTITUCION_POSITIVOS } from './constants'

export function claseBadgeEstadoInstitucion(estado) {
  return ESTADOS_INSTITUCION_POSITIVOS.includes(estado) ? 'badge-done' : 'badge-pending'
}
