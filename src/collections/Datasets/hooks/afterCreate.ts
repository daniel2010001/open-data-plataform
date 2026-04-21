import type { CollectionAfterChangeHook } from 'payload'
import type { Dataset } from '@/payload-types'
import type { AuthenticatedUser } from '@/access/types'

/**
 * R2 — Al crearse un dataset, el creador se convierte automáticamente en el
 * primer steward. Se registra en el array `collaborators` embebido con role: steward.
 *
 * Solo actúa en operation 'create'. En update, no toca collaborators.
 */
export const datasetsAfterCreate: CollectionAfterChangeHook<Dataset> = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'create') return doc

  const userId = req.user?.id
  if (!userId) return doc

  const collaborator = {
    user: userId,
    role: 'steward' as const,
    assignmentType: 'direct' as const,
    teamId: null,
    orgIdAtAssignment: (req.user as AuthenticatedUser)?.organization ?? null,
    assignedBy: userId,
    revokedAt: null,
  }

  const updated = await req.payload.update({
    collection: 'datasets',
    id: doc.id,
    data: {
      collaborators: [collaborator],
    },
    req,
    overrideAccess: true,
  })

  return updated
}
