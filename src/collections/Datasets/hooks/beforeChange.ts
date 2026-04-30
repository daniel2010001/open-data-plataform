import type { CollectionBeforeChangeHook } from 'payload'
import type { Dataset } from '@/payload-types'
import type { AuthenticatedUser } from '@/access/types'

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

// Orden de visibilidad — índice mayor = más abierto
const VISIBILITY_LEVEL: Record<string, number> = {
  private: 0,
  org_only: 1,
  public: 2,
}

/**
 * Maneja las reglas del flujo editorial y visibilidad de Datasets.
 *
 * R3  — Si un dataset `approved` es editado en campos de contenido, vuelve a `draft`
 * R5  — Auto-review prohibido: el owner no puede aprobar contenido que él mismo editó
 * R6  — Owner puede degradar visibilidad unilateralmente (sin solicitud del steward)
 * R7  — Elevación de visibilidad requiere solicitud del steward; owner no puede elevar sin ella
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

  // --- Reglas de visibilidad R6/R7 ---
  const incomingVisibility = data.visibility
  const currentVisibility = originalDoc?.visibility

  if (incomingVisibility && incomingVisibility !== currentVisibility) {
    const user = req.user as AuthenticatedUser
    const isOwner = user?.orgRole === 'owner'
    const isSysadmin = user?.systemRole === 'sysadmin'

    const currentLevel = VISIBILITY_LEVEL[currentVisibility ?? 'private'] ?? 0
    const incomingLevel = VISIBILITY_LEVEL[incomingVisibility] ?? 0
    const isElevation = incomingLevel > currentLevel

    if (isElevation) {
      // R7 — Elevación: requiere solicitud del steward. Owner no puede elevar sin ella.
      if (!isSysadmin) {
        const pendingRequest = originalDoc?.visibilityRequest
        if (!pendingRequest) {
          throw new Error(
            'Para elevar la visibilidad, el steward debe hacer una solicitud primero. El owner no puede elevar sin solicitud.',
          )
        }
        if (pendingRequest !== incomingVisibility) {
          throw new Error(
            `La solicitud de visibilidad es "${pendingRequest}", no "${incomingVisibility}". Solo podés aprobar la visibilidad solicitada.`,
          )
        }
        if (!isOwner) {
          throw new Error(
            'Solo el owner puede aprobar solicitudes de elevación de visibilidad.',
          )
        }
        // Owner aprueba — limpiar la solicitud
        data = { ...data, visibilityRequest: null, visibilityRequestedAt: null }
        // TODO: Fase 8 — registrar en AuditLog: DATASET_VISIBILITY_ELEVATED
      }
    } else {
      // R6 — Degradación unilateral: solo owner o sysadmin
      if (!isOwner && !isSysadmin) {
        throw new Error(
          'Solo el owner puede degradar la visibilidad de un dataset.',
        )
      }
      // TODO: Fase 8 — registrar en AuditLog: DATASET_VISIBILITY_DEGRADED con reason
    }
  }

  // Solicitud de visibilidad por steward — setear visibilityRequestedAt automáticamente
  if (data.visibilityRequest && data.visibilityRequest !== originalDoc?.visibilityRequest) {
    const user = req.user as AuthenticatedUser
    const isOwner = user?.orgRole === 'owner'
    const isSysadmin = user?.systemRole === 'sysadmin'

    if (isOwner || isSysadmin) {
      throw new Error(
        'El owner no puede hacer solicitudes de visibilidad. Solo el steward puede solicitarla.',
      )
    }

    // Validar que la solicitud sea una elevación real
    const currentLevel = VISIBILITY_LEVEL[originalDoc?.visibility ?? 'private'] ?? 0
    const requestedLevel = VISIBILITY_LEVEL[data.visibilityRequest] ?? 0
    if (requestedLevel <= currentLevel) {
      throw new Error(
        'La solicitud de visibilidad debe ser una elevación (mayor visibilidad que la actual).',
      )
    }

    data = { ...data, visibilityRequestedAt: new Date().toISOString() }
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
