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

type CollaboratorRow = NonNullable<Dataset['collaborators']>[number]
type CollaboratorInput = Partial<CollaboratorRow> & { reason?: string }

/**
 * Maneja las reglas del flujo editorial, visibilidad y collaborators de Datasets.
 *
 * R3  — Si un dataset `approved` es editado en campos de contenido, vuelve a `draft`
 * R5  — Auto-review prohibido: el owner no puede aprobar contenido que él mismo editó
 * R6  — Owner puede degradar visibilidad unilateralmente (sin solicitud del steward)
 * R7  — Elevación de visibilidad requiere solicitud del steward; owner no puede elevar sin ella
 * R10 — `deletedAt` bloquea toda mutación
 * R11 — Solo `status: active` puede avanzar en el flujo editorial
 * R12 — Collaborator con acceso explícito prevalece sobre visibilidad (cubierto en access read)
 * R13 — Collaborators solo de la misma org en v1
 */
export const datasetsBeforeChange: CollectionBeforeChangeHook<Dataset> = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (operation === 'create') return data

  const user = req.user as AuthenticatedUser
  const isOwner = user?.orgRole === 'owner'
  const isSysadmin = user?.systemRole === 'sysadmin'

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
    if (isOwner || isSysadmin) {
      throw new Error(
        'El owner no puede hacer solicitudes de visibilidad. Solo el steward puede solicitarla.',
      )
    }

    const currentLevel = VISIBILITY_LEVEL[originalDoc?.visibility ?? 'private'] ?? 0
    const requestedLevel = VISIBILITY_LEVEL[data.visibilityRequest] ?? 0
    if (requestedLevel <= currentLevel) {
      throw new Error(
        'La solicitud de visibilidad debe ser una elevación (mayor visibilidad que la actual).',
      )
    }

    data = { ...data, visibilityRequestedAt: new Date().toISOString() }
  }

  // --- Reglas de collaborators R13 + guards de rol ---
  if (data.collaborators) {
    const existingById = new Map(
      (originalDoc?.collaborators ?? []).map((c) => [c.id, c]),
    )

    const actorId = user?.id
    const actorOrgId = user?.organization

    // ¿El actor es steward o editor activo en este dataset?
    const actorIsActiveCollaborator = (originalDoc?.collaborators ?? []).some((c) => {
      const uid = typeof c.user === 'object' && c.user !== null ? c.user.id : c.user
      return uid === actorId && (c.role === 'steward' || c.role === 'editor') && !c.revokedAt
    })

    const processedCollaborators: CollaboratorInput[] = []

    for (const incoming of data.collaborators as CollaboratorInput[]) {
      const existing = incoming.id ? existingById.get(incoming.id) : undefined
      const isNew = !existing
      const targetUserId =
        typeof incoming.user === 'object' && incoming.user !== null
          ? (incoming.user as { id: number }).id
          : (incoming.user as number | undefined)

      const roleChanged = existing && incoming.role && incoming.role !== existing.role
      const revokedChanged =
        existing &&
        incoming.revokedAt !== undefined &&
        incoming.revokedAt !== existing.revokedAt

      // Fila sin cambios relevantes — pasar sin tocar
      if (!isNew && !roleChanged && !revokedChanged) {
        processedCollaborators.push(incoming)
        continue
      }

      if (isNew || roleChanged) {
        const targetRole = incoming.role

        // R13 — Solo usuarios de la misma org
        if (targetUserId && actorOrgId) {
          const membership = await req.payload.find({
            collection: 'org-memberships',
            where: {
              and: [
                { user: { equals: targetUserId } },
                { organization: { equals: actorOrgId } },
              ],
            },
            limit: 1,
            overrideAccess: true,
          })
          if (membership.totalDocs === 0) {
            throw new Error(
              'El usuario no pertenece a esta organización. En v1, los collaborators deben ser de la misma org. (R13)',
            )
          }
        }

        // Guard de rol
        if (targetRole === 'steward') {
          // Solo owner puede asignar steward — con reason obligatorio
          if (!isOwner && !isSysadmin) {
            throw new Error('Solo el owner puede asignar el rol de steward a un collaborator.')
          }
          if (!incoming.reason?.trim()) {
            throw new Error(
              'Se requiere una justificación (reason) para asignar el rol de steward.',
            )
          }
          // TODO: Fase 8 — registrar en AuditLog: STEWARD_ASSIGNED con reason
        } else if (targetRole === 'editor' || targetRole === 'viewer') {
          // Steward activo, owner o sysadmin pueden asignar editor/viewer
          if (!isOwner && !isSysadmin && !actorIsActiveCollaborator) {
            throw new Error('Solo el steward, owner o sysadmin pueden asignar collaborators.')
          }
        }

        // Auto-setear assignedBy y orgIdAtAssignment en filas nuevas
        if (isNew) {
          const targetMembership = targetUserId
            ? await req.payload.find({
                collection: 'org-memberships',
                where: { user: { equals: targetUserId } },
                limit: 1,
                overrideAccess: true,
              })
            : null

          const orgIdAtAssignment =
            targetMembership?.docs[0]
              ? typeof targetMembership.docs[0].organization === 'object'
                ? (targetMembership.docs[0].organization as { id: number }).id
                : targetMembership.docs[0].organization
              : null

          processedCollaborators.push({
            ...incoming,
            assignedBy: actorId,
            orgIdAtAssignment: orgIdAtAssignment as number | null | undefined,
          })
          continue
        }
      }

      // Revocación — steward activo, owner o sysadmin pueden revocar
      if (revokedChanged && incoming.revokedAt) {
        if (!isOwner && !isSysadmin && !actorIsActiveCollaborator) {
          throw new Error('Solo el steward, owner o sysadmin pueden revocar collaborators.')
        }
        // TODO: Fase 8 — registrar en AuditLog: COLLABORATOR_REMOVED
      }

      processedCollaborators.push(incoming)
    }

    data = { ...data, collaborators: processedCollaborators as typeof data.collaborators }
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
