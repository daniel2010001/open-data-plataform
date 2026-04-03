import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

import type { Dataset, User } from '@/payload-types'

type DatasetStatus = NonNullable<Dataset['status']>

/**
 * Transitions allowed per role.
 *
 * sysadmin bypasses all checks — handled before this map is consulted.
 *
 * 'owner' | 'admin'  → full control
 * collaborator 'editor' → can only submit for review (draft → in_review)
 */
const ALLOWED_TRANSITIONS: Record<DatasetStatus, DatasetStatus[]> = {
  draft: ['in_review'],
  in_review: ['draft', 'published'],
  published: ['archived'],
  archived: ['draft'],
}

/** Transitions restricted to owner/admin only (editors cannot do these) */
const ADMIN_ONLY_TRANSITIONS: Array<`${DatasetStatus}->${DatasetStatus}`> = [
  'in_review->draft',
  'in_review->published',
  'published->archived',
  'archived->draft',
]

/**
 * Validates that the status transition is allowed for the current user's role.
 * Throws APIError (400) if the transition is invalid or unauthorized.
 *
 * Rules:
 * - sysadmin: any transition allowed
 * - owner/admin of the org: any valid transition allowed
 * - collaborator editor: only draft → in_review
 * - collaborator viewer / unauthenticated: cannot change status
 */
export const validateStatusTransition: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  // On create there's no transition to validate
  if (operation === 'create') return data

  // If status isn't changing, nothing to validate
  const nextStatus = data.status as DatasetStatus | undefined
  if (!nextStatus || !originalDoc?.status) return data

  const currentStatus = originalDoc.status as DatasetStatus
  if (currentStatus === nextStatus) return data

  const user = req.user as User | null

  // Sysadmin bypasses all transition rules
  if (user?.systemRole === 'sysadmin') return data

  // Validate the transition is structurally valid
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes(nextStatus)) {
    throw new APIError(`Transición de estado inválida: ${currentStatus} → ${nextStatus}`, 400)
  }

  const transitionKey = `${currentStatus}->${nextStatus}` as `${DatasetStatus}->${DatasetStatus}`
  const isAdminOnly = ADMIN_ONLY_TRANSITIONS.includes(transitionKey)

  if (isAdminOnly) {
    const orgRole = user?.orgRole
    if (orgRole !== 'owner' && orgRole !== 'admin') {
      throw new APIError(
        `Sin permisos para la transición ${currentStatus} → ${nextStatus}. Se requiere rol owner o admin.`,
        403,
      )
    }
  }

  return data
}
