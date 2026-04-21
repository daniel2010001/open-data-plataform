import type { CollectionBeforeChangeHook } from 'payload'
import type { Dataset } from '@/payload-types'

// Campos de contenido que al ser editados hacen que un dataset approved vuelva a draft (R3)
const CONTENT_FIELDS: (keyof Dataset)[] = [
  'title',
  'summary',
  'description',
  'category',
  'tags',
  'license',
  'licenseCustom',
]

/**
 * Maneja las reglas del flujo editorial de Datasets.
 *
 * R3  — Si un dataset `approved` es editado en campos de contenido, vuelve a `draft`
 * R5  — Auto-review prohibido: el owner no puede aprobar contenido que él mismo editó
 * R10 — `deletedAt` bloquea toda mutación
 * R11 — Solo `status: active` puede avanzar en el flujo editorial
 */
export const datasetsBeforeChange: CollectionBeforeChangeHook<Dataset> = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (operation === 'create') return data

  // R10 — deletedAt bloquea toda mutación
  if (originalDoc?.deletedAt) {
    throw new Error(
      'Este dataset fue eliminado. No se puede modificar. Solo un sysadmin puede restaurarlo.',
    )
  }

  // R11 — Solo status: active puede avanzar en el flujo editorial
  const incomingEditorial = data.editorialStatus
  const currentEditorial = originalDoc?.editorialStatus
  const currentStatus = originalDoc?.status

  if (
    incomingEditorial &&
    incomingEditorial !== currentEditorial &&
    currentStatus !== 'active'
  ) {
    throw new Error(
      `No se puede cambiar el estado editorial cuando el dataset está ${currentStatus}. El flujo queda suspendido hasta que el estado operativo vuelva a active.`,
    )
  }

  // R3 — Si está approved y se edita contenido, forzar draft
  if (currentEditorial === 'approved') {
    const hasContentChange = CONTENT_FIELDS.some(
      (field) => field in data && data[field as keyof typeof data] !== undefined,
    )
    if (hasContentChange) {
      data = { ...data, editorialStatus: 'draft' }
    }
  }

  // R5 — Auto-review prohibido: quién aprueba no puede haber editado el dataset
  if (incomingEditorial === 'approved') {
    const reviewerId = req.user?.id
    const collaborators = originalDoc?.collaborators ?? []

    const isEditor = collaborators.some((c) => {
      const collabUserId =
        typeof c.user === 'object' && c.user !== null ? c.user.id : c.user
      return (
        collabUserId === reviewerId &&
        (c.role === 'steward' || c.role === 'editor') &&
        !c.revokedAt
      )
    })

    if (isEditor) {
      throw new Error(
        'Auto-review prohibido: no podés aprobar un dataset que editaste vos mismo.',
      )
    }
  }

  // Validación de licenseCustom requerido cuando license === 'other'
  const license = data.license ?? originalDoc?.license
  const licenseCustom = data.licenseCustom ?? originalDoc?.licenseCustom
  if (license === 'other' && !licenseCustom?.trim()) {
    throw new Error(
      'El campo licenseCustom es requerido cuando la licencia es "Otro".',
    )
  }

  return data
}
