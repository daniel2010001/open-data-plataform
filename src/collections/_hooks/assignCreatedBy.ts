import type { CollectionBeforeChangeHook } from 'payload'
import type { User } from '@/payload-types'

/**
 * Hook beforeChange — compartido entre collections
 *
 * Autoasigna `createdBy` con el id del usuario autenticado en el momento del create.
 * En update el campo no se modifica — es inmutable post-creación (auditoría).
 *
 * Usa User["id"] para que el tipo sea consistente con el adapter activo:
 * - Dev (SQLite/PG sin UUID): number
 * - Prod con UUID plugin: string
 * El tipo inferido evita hardcodear la representación.
 */
export const assignCreatedBy: CollectionBeforeChangeHook = ({ data, req, operation }) => {
  if (operation !== 'create') return data

  const userId = req.user?.id as User['id'] | undefined
  if (!userId) return data

  return { ...data, createdBy: userId }
}
