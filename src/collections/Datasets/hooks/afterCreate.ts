import type { CollectionAfterChangeHook } from 'payload'
import type { Dataset } from '@/payload-types'
import type { AuthenticatedUser } from '@/access/types'

/**
 * R2 — Al crearse un dataset, el creador se convierte automáticamente en el
 * primer steward. Se registra en el array `collaborators` embebido con role: steward.
 *
 * También propaga `everPublished: true` a todos los resources del dataset cuando
 * `editorialStatus` transiciona a `approved`. Esto permite que beforeDelete de
 * Resources distinga entre hard delete (nunca publicado) y soft-delete semántico.
 */
export const datasetsAfterCreate: CollectionAfterChangeHook<Dataset> = async ({
  doc,
  req,
  operation,
  previousDoc,
}) => {
  // Propagar everPublished cuando editorialStatus → approved
  if (
    operation === 'update' &&
    doc.editorialStatus === 'approved' &&
    previousDoc?.editorialStatus !== 'approved'
  ) {
    await req.payload.update({
      collection: 'resources',
      where: {
        and: [
          { dataset: { equals: doc.id } },
          { everPublished: { not_equals: true } },
        ],
      },
      data: { everPublished: true },
      overrideAccess: true,
    })
    return doc
  }

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
