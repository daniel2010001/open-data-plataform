import type { CollectionBeforeChangeHook } from 'payload'
import type { Resource } from '@/payload-types'
import type { AuthenticatedUser } from '@/access/types'

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

  return data
}
