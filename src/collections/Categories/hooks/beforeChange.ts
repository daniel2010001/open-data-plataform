import type { CollectionBeforeChangeHook } from 'payload'
import type { Category } from '@/payload-types'

/**
 * Hook beforeChange — Categories
 *
 * Responsabilidades:
 * 1. Calcula `level` desde el parent (R8): parent.level + 1, o 0 si es raíz.
 * 2. Valida unicidad de `name` dentro del mismo `parent` (no hay unique compuesto nativo en Payload).
 *
 * Nota: propagar `level` recursivamente a los hijos al mover un subárbol
 * es deuda técnica documentada — fuera de scope v1.
 */
export const categoriesBeforeChange: CollectionBeforeChangeHook<Category> = async ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  const parentId = data.parent ?? null

  // -------------------------------------------------------------------------
  // 1. Calcular level
  // -------------------------------------------------------------------------
  let level = 0

  if (parentId) {
    const parent = await req.payload.findByID({
      collection: 'categories',
      id: parentId as Category['id'],
      req,
      overrideAccess: true,
    })

    level = ((parent as Category).level ?? 0) + 1
  }

  // -------------------------------------------------------------------------
  // 2. Validar name único por parent
  //    Solo aplica si name o parent cambiaron.
  // -------------------------------------------------------------------------
  const nameChanged = operation === 'create' || data.name !== originalDoc?.name
  const parentChanged = operation === 'create' || data.parent !== originalDoc?.parent

  if (nameChanged || parentChanged) {
    const query = await req.payload.find({
      collection: 'categories',
      where: {
        and: [
          { name: { equals: data.name } },
          parentId
            ? { parent: { equals: parentId } }
            : { parent: { exists: false } },
        ],
        // Excluir el doc actual en updates
        ...(operation === 'update' && originalDoc?.id
          ? { id: { not_equals: originalDoc.id } }
          : {}),
      },
      limit: 1,
      req,
      overrideAccess: true,
    })

    if (query.totalDocs > 0) {
      throw new Error(
        `Ya existe una categoría con el nombre "${data.name}" en ${parentId ? 'ese parent' : 'el nivel raíz'}.`,
      )
    }
  }

  return { ...data, level }
}
