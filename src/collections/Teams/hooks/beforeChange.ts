import type { CollectionBeforeChangeHook } from 'payload'
import type { AuthenticatedUser } from '@/access/types'

/**
 * Reglas de Teams:
 *
 * R2 — Solo usuarios que pertenezcan a la misma org pueden ser miembros del team.
 *       Valida cada user en el array `members` contra OrgMemberships.
 */
export const teamsBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const user = req.user as AuthenticatedUser
  const isSysadmin = user?.systemRole === 'sysadmin'

  // Determinar la org del team — en create viene de data, en update del doc existente
  const orgId =
    operation === 'create'
      ? (typeof data.organization === 'object' ? (data.organization as { id: number }).id : data.organization)
      : (typeof originalDoc?.organization === 'object'
          ? (originalDoc.organization as { id: number }).id
          : originalDoc?.organization)

  if (!orgId) return data

  // R2 — Validar que todos los miembros nuevos pertenecen a la org
  if (data.members && Array.isArray(data.members)) {
    // Obtener IDs existentes para comparar solo los nuevos (en update)
    const existingMemberIds = new Set(
      (originalDoc?.members ?? []).map((m: number | { id: number }) =>
        typeof m === 'object' ? m.id : m,
      ),
    )

    for (const member of data.members as Array<number | { id: number }>) {
      const memberId = typeof member === 'object' ? member.id : member

      // Si ya era miembro, no re-validar
      if (!isSysadmin && existingMemberIds.has(memberId)) continue

      const membership = await req.payload.find({
        collection: 'org-memberships',
        where: {
          and: [
            { user: { equals: memberId } },
            { organization: { equals: orgId } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      if (membership.totalDocs === 0) {
        throw new Error(
          `El usuario ${memberId} no pertenece a esta organización. Solo usuarios de la misma org pueden ser miembros de un team. (R2)`,
        )
      }
    }
  }

  return data
}
