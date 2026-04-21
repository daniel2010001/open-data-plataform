import type { CollectionBeforeDeleteHook } from 'payload'

/**
 * Los datasets nunca se eliminan de verdad — solo soft-delete via `deletedAt`.
 * Bloquear el delete real en todos los casos.
 *
 * Para "eliminar" un dataset, se usa el campo `deletedAt` (R10).
 */
export const datasetsBeforeDelete: CollectionBeforeDeleteHook = ({ req }) => {
  const isSysadmin = req.user?.systemRole === 'sysadmin'
  if (!isSysadmin) {
    throw new Error(
      'Los datasets no se pueden eliminar permanentemente. Usá el campo deletedAt para hacer un soft-delete.',
    )
  }
  // Sysadmin puede hacer hard delete (purge) — ver Reglas Globales
}
