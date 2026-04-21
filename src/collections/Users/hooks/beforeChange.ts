import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Hook beforeChange — Users
 *
 * R10 (Users spec): Debe existir al menos un sysadmin activo en todo momento.
 * Bloquea la operación si:
 *   - se intenta desactivar (isActive: false) al último sysadmin activo
 *   - se intenta degradar (systemRole: 'user') al último sysadmin activo
 */
export const preventLastSysadminDeactivation: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return data

  const isDeactivating = data.isActive === false && originalDoc?.isActive === true
  const isDegrading = data.systemRole === 'user' && originalDoc?.systemRole === 'sysadmin'

  if (!isDeactivating && !isDegrading) return data

  // Contamos sysadmins activos excluyendo el doc actual
  const result = await req.payload.find({
    collection: 'users',
    where: {
      and: [
        { systemRole: { equals: 'sysadmin' } },
        { isActive: { equals: true } },
        { id: { not_equals: originalDoc.id } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  if (result.totalDocs === 0) {
    throw new Error(
      'No se puede desactivar o degradar al último sysadmin activo del sistema.',
    )
  }

  return data
}
