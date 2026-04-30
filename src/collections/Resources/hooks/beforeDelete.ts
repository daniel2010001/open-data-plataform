import type { CollectionBeforeDeleteHook } from 'payload'

/**
 * R7 vs R8 — Lógica de delete de Resources.
 *
 * Si el resource `everPublished === true` (el dataset fue aprobado al menos una vez):
 *   → No se puede eliminar físicamente. Se setea `excludeFromNextVersion: true` (soft-delete semántico).
 *   → Solo sysadmin puede hacer hard delete (purge).
 *
 * Si el resource nunca fue publicado (`everPublished === false`):
 *   → Permitir delete físico (cualquier actor con acceso de delete).
 *   → Sysadmin siempre puede.
 */
export const resourcesBeforeDelete: CollectionBeforeDeleteHook = async ({ req, id }) => {
  const isSysadmin = req.user?.systemRole === 'sysadmin'

  // Sysadmin puede purge siempre
  if (isSysadmin) return

  // Leer el resource actual para verificar everPublished
  const resource = await req.payload.findByID({
    collection: 'resources',
    id,
    overrideAccess: true,
  })

  if (!resource) return

  if (resource.everPublished) {
    // Ya fue publicado — no se puede eliminar físicamente
    // Setear excludeFromNextVersion: true en lugar de borrar
    await req.payload.update({
      collection: 'resources',
      id,
      data: {
        excludeFromNextVersion: true,
        deletedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    throw new Error(
      'Este resource ya fue publicado. No se puede eliminar permanentemente. Fue marcado como "no incluir en próxima versión".',
    )
  }

  // Nunca publicado — permitir delete físico (no lanzar error)
}
