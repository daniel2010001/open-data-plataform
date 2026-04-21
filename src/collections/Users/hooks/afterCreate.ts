import type { CollectionAfterChangeHook } from 'payload'

import type { AuthenticatedUser } from '@/access/types'

/**
 * Hook afterChange — Users
 *
 * Si el user que crea es un owner (via JWT), auto-asigna una OrgMembership
 * con orgRole: member para el nuevo user en la misma org del owner.
 *
 * R2 (Users spec): Owner solo puede crear users para su propia org.
 * El hook auto-asigna la membresía — el owner no elige la org.
 *
 * Solo se ejecuta en operation: 'create'.
 */
export const autoAssignMembership: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'create') return doc

  const user = req.user as AuthenticatedUser | null
  if (!user) return doc

  // Solo si el creador es owner y tiene org en el JWT
  if (user.orgRole !== 'owner' || !user.organization) return doc

  const orgId = user.organization

  // Verificar que el nuevo user no tenga ya una membresía (constraint R1 OrgMemberships)
  const existing = await req.payload.find({
    collection: 'org-memberships',
    where: { user: { equals: doc.id } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) return doc

  await req.payload.create({
    collection: 'org-memberships',
    data: {
      user: doc.id,
      organization: orgId,
      orgRole: 'member',
    },
    overrideAccess: true,
  })

  return doc
}
