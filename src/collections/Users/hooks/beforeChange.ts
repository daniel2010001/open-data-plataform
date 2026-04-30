import type { CollectionBeforeChangeHook } from 'payload'
import { createAuditLog } from '../../_hooks/createAuditLog'

/**
 * Hook beforeChange — Users
 *
 * R10 (Users spec): Debe existir al menos un sysadmin activo en todo momento.
 * Bloquea la operación si:
 *   - se intenta desactivar (isActive: false) al último sysadmin activo
 *   - se intenta degradar (systemRole: 'user') al último sysadmin activo
 *
 * Fase 8 — Audit log USER_DEACTIVATED cuando isActive cambia a false.
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

  // Audit log: USER_DEACTIVATED cuando isActive cambia a false
  if (isDeactivating && req.user?.id) {
    await createAuditLog(req, {
      action: 'USER_DEACTIVATED',
      actor: req.user.id,
      targetType: 'user',
      targetId: originalDoc.id,
      reason: (data as { reason?: string }).reason,
    })
  }

  return data
}
