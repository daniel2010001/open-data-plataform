import type { CollectionBeforeChangeHook } from 'payload'
import type { Resource } from '@/payload-types'
import type { AuthenticatedUser } from '@/access/types'
import { createAuditLog } from '../../_hooks/createAuditLog'

/**
 * Reglas del flujo de Resources.
 *
 * R4  — `resourceType` es inmutable post-creación
 * R5  — Si el dataset está `in_review`, bloquear toda mutación (excepto sysadmin)
 * R8  — `deletedAt` en el resource bloquea toda mutación
 * Validación — `externalUrl` requerido si `resourceType === 'link'`
 * Validación — campos file requeridos si `resourceType === 'file'`
 */
export const resourcesBeforeChange: CollectionBeforeChangeHook<Resource> = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const user = req.user as AuthenticatedUser
  const isSysadmin = user?.systemRole === 'sysadmin'

  if (operation === 'create') {
    // Validación en create: campos requeridos según resourceType
    const resourceType = data.resourceType
    if (resourceType === 'link' && !data.externalUrl?.trim()) {
      throw new Error('El campo externalUrl es requerido para recursos de tipo "link".')
    }
    if (resourceType === 'file' && !data.fileStorageKey?.trim()) {
      throw new Error('El campo fileStorageKey es requerido para recursos de tipo "file".')
    }
    return data
  }

  // R8 — deletedAt en el resource bloquea toda mutación
  if (originalDoc?.deletedAt) {
    throw new Error(
      'Este resource fue eliminado. No se puede modificar. Solo un sysadmin puede restaurarlo.',
    )
  }

  // R4 — resourceType inmutable post-creación
  if (data.resourceType && data.resourceType !== originalDoc?.resourceType) {
    throw new Error(
      'El tipo de recurso (resourceType) no puede modificarse después de creado.',
    )
  }

  // R5 — Si el dataset está in_review, bloquear toda mutación (excepto sysadmin)
  if (!isSysadmin) {
    const datasetId =
      typeof originalDoc?.dataset === 'object' && originalDoc.dataset !== null
        ? (originalDoc.dataset as { id: number }).id
        : originalDoc?.dataset

    if (datasetId) {
      const dataset = await req.payload.findByID({
        collection: 'datasets',
        id: datasetId,
        overrideAccess: true,
      })

      if (dataset?.editorialStatus === 'in_review') {
        throw new Error(
          'El dataset está en revisión. No se pueden modificar sus resources hasta que la revisión finalice.',
        )
      }
    }
  }

  // Validación de consistencia por tipo (si se está cambiando el URL o campos file)
  const resourceType = originalDoc?.resourceType
  if (resourceType === 'link') {
    const incomingUrl = data.externalUrl ?? originalDoc?.externalUrl
    if (!incomingUrl?.trim()) {
      throw new Error('El campo externalUrl es requerido para recursos de tipo "link".')
    }
  }
  if (resourceType === 'file') {
    const incomingKey = data.fileStorageKey ?? originalDoc?.fileStorageKey
    if (!incomingKey?.trim()) {
      throw new Error('El campo fileStorageKey es requerido para recursos de tipo "file".')
    }
  }

  // --- Resolución del orgId del resource (via dataset) ---
  const getOrgId = async (): Promise<number | null> => {
    const datasetId =
      typeof originalDoc?.dataset === 'object' && originalDoc.dataset !== null
        ? (originalDoc.dataset as { id: number }).id
        : originalDoc?.dataset
    if (!datasetId) return null
    const dataset = await req.payload.findByID({
      collection: 'datasets',
      id: datasetId,
      depth: 0,
      overrideAccess: true,
    })
    if (!dataset?.organization) return null
    return typeof dataset.organization === 'object'
      ? (dataset.organization as { id: number }).id
      : (dataset.organization as number)
  }

  // --- Audit log: cambio de visibilidad ---
  if (data.visibility && data.visibility !== originalDoc?.visibility) {
    await createAuditLog(req, {
      action: 'RESOURCE_VISIBILITY_CHANGED',
      actor: req.user!.id,
      targetType: 'resource',
      targetId: originalDoc!.id,
      organizationId: await getOrgId(),
      payload: { from: originalDoc?.visibility, to: data.visibility },
      reason: (data as { reason?: string }).reason,
    })
  }

  // --- Audit log: cambio de status operativo ---
  if (data.status && data.status !== originalDoc?.status) {
    const orgId = await getOrgId()

    if (data.status === 'archived') {
      await createAuditLog(req, {
        action: 'RESOURCE_ARCHIVED',
        actor: req.user!.id,
        targetType: 'resource',
        targetId: originalDoc!.id,
        organizationId: orgId,
        reason: (data as { reason?: string }).reason,
      })
    } else if (data.status === 'disabled') {
      await createAuditLog(req, {
        action: 'RESOURCE_DISABLED',
        actor: req.user!.id,
        targetType: 'resource',
        targetId: originalDoc!.id,
        organizationId: orgId,
        reason: (data as { reason?: string }).reason,
      })
    }
  }

  // --- Audit log: soft-delete y restore ---
  const incomingDeletedAt = (data as { deletedAt?: string | null }).deletedAt
  const currentDeletedAt = originalDoc?.deletedAt
  if (incomingDeletedAt !== undefined && incomingDeletedAt !== currentDeletedAt) {
    const orgId = await getOrgId()

    if (incomingDeletedAt && !currentDeletedAt) {
      await createAuditLog(req, {
        action: 'RESOURCE_SOFT_DELETED',
        actor: req.user!.id,
        targetType: 'resource',
        targetId: originalDoc!.id,
        organizationId: orgId,
        reason: (data as { reason?: string }).reason,
      })
    } else if (!incomingDeletedAt && currentDeletedAt) {
      await createAuditLog(req, {
        action: 'RESOURCE_RESTORED',
        actor: req.user!.id,
        targetType: 'resource',
        targetId: originalDoc!.id,
        organizationId: orgId,
        reason: (data as { reason?: string }).reason,
      })
    }
  }

  return data
}
