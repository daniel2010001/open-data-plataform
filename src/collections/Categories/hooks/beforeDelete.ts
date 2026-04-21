import type { CollectionBeforeDeleteHook } from 'payload'

/**
 * Hook beforeDelete — Categories
 *
 * Guards:
 * - R7: No se puede eliminar una categoría que tiene subcategorías.
 *        Requiere mover o eliminar hijos primero.
 * - R6: No se puede eliminar una categoría con datasets asignados.
 *        STUB — implementación completa en Bloque 3 (Datasets).
 */
export const categoriesBeforeDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // -------------------------------------------------------------------------
  // R7 — Guard: no subcategorías
  // -------------------------------------------------------------------------
  const children = await req.payload.find({
    collection: 'categories',
    where: {
      parent: { equals: id },
    },
    limit: 1,
    req,
    overrideAccess: true,
  })

  if (children.totalDocs > 0) {
    throw new Error(
      'No se puede eliminar una categoría con subcategorías. Mové o eliminá los hijos primero.',
    )
  }

  // -------------------------------------------------------------------------
  // R6 — Guard: no datasets asignados (STUB — Bloque 3)
  // -------------------------------------------------------------------------
  // TODO (Bloque 3): descomentar cuando exista la collection 'datasets'
  //
  // const datasets = await req.payload.find({
  //   collection: 'datasets',
  //   where: { category: { equals: id } },
  //   limit: 1,
  //   req,
  //   overrideAccess: true,
  // })
  //
  // if (datasets.totalDocs > 0) {
  //   throw new Error(
  //     'No se puede eliminar una categoría con datasets asignados. Reasigná los datasets primero.',
  //   )
  // }
}
