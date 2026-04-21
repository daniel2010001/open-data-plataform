import type { CollectionBeforeChangeHook } from 'payload'

import type { AuthenticatedUser } from '@/access/types'

/**
 * R1 (OrgMemberships spec): UNIQUE(user_id)
 * Un user solo puede tener UNA membresía activa en v1.
 * Se valida a nivel de aplicación — equivalente al constraint DB.
 */
export const enforceUniqueUserMembership: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'create') return data

  const userId = data.user
  if (!userId) return data

  const existing = await req.payload.find({
    collection: 'org-memberships',
    where: { user: { equals: userId } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) {
    throw new Error(
      `El usuario ya tiene una membresía activa en otra organización. En v1 un user solo puede pertenecer a una org.`,
    )
  }

  return data
}

/**
 * R2 (OrgMemberships spec): Solo puede existir un owner por org.
 * R5 (OrgMemberships spec): Owner no puede asignar orgRole: 'owner' — solo sysadmin.
 *
 * Este hook:
 * 1. Si el actor es owner (no sysadmin) e intenta asignar orgRole: 'owner' → lanza error
 * 2. Si se asigna orgRole: 'owner', verifica que no exista ya un owner en esa org
 */
export const enforceOwnerConstraints: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const actor = req.user as AuthenticatedUser | null

  // R5 — Owner no puede asignar orgRole: 'owner'
  if (
    data.orgRole === 'owner' &&
    actor?.systemRole !== 'sysadmin'
  ) {
    throw new Error(
      'Solo un sysadmin puede asignar el rol owner. Usá admin o member.',
    )
  }

  // R2 — Solo puede existir un owner por org
  if (data.orgRole === 'owner') {
    const orgId = data.organization
    if (!orgId) return data

    // En update: excluir el doc actual (podría estar cambiando el owner de la misma entrada)
    const whereClause: Record<string, unknown> = {
      and: [
        { organization: { equals: orgId } },
        { orgRole: { equals: 'owner' } },
      ],
    }

    if (operation === 'update' && originalDoc?.id) {
      ;(whereClause.and as unknown[]).push({ id: { not_equals: originalDoc.id } })
    }

    const existing = await req.payload.find({
      collection: 'org-memberships',
      where: whereClause as any,
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      throw new Error(
        'Esta organización ya tiene un owner. Para transferir el ownership, primero cambiá el rol del owner actual.',
      )
    }
  }

  // R5 — Owner no puede asignar orgRole: 'owner' en update tampoco
  if (operation === 'update' && data.orgRole === 'owner' && actor?.systemRole !== 'sysadmin') {
    throw new Error('Solo un sysadmin puede cambiar el orgRole a owner.')
  }

  return data
}
