import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Hook beforeValidate — Tags
 *
 * R4 — Normalización obligatoria: lowercase + trim antes de guardar.
 * Si el tag ya existe (mismo name normalizado), lanza error explícito
 * para que el caller reutilice el tag existente en lugar de crear uno nuevo.
 *
 * La constraint UNIQUE en la columna `name` actúa como backstop para
 * creaciones concurrentes (race condition) — ver spec: casos límite.
 *
 * El garbage collection (R6) vive en Bloque 3 — hooks de Datasets.
 */
export const tagsBeforeValidate: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (!data?.name) return data

  // -------------------------------------------------------------------------
  // Normalización: lowercase + trim
  // -------------------------------------------------------------------------
  const normalized = (data.name as string).toLowerCase().trim()

  if (!normalized) {
    throw new Error('El nombre del tag no puede estar vacío o contener solo espacios.')
  }

  // -------------------------------------------------------------------------
  // Dedup explícito: si ya existe un tag con ese nombre, informar al caller.
  // Payload expone el tag existente en el mensaje para que el cliente lo reutilice.
  // Solo aplica en create — en update, el tag ya tiene su identity.
  // -------------------------------------------------------------------------
  if (operation === 'create') {
    const existing = await req.payload.find({
      collection: 'tags',
      where: { name: { equals: normalized } },
      limit: 1,
      req,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      const existingTag = existing.docs[0]
      throw new Error(
        `El tag "${normalized}" ya existe (id: ${existingTag.id}). Reutilizá el existente en lugar de crear uno nuevo.`,
      )
    }
  }

  return { ...data, name: normalized }
}
