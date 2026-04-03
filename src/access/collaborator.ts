import type { Access, Where } from 'payload'

import type { Dataset } from '@/payload-types'

type CollaboratorRole = NonNullable<Dataset['collaborators']>[number]['role']

/**
 * Returns a Where constraint that matches documents where the current user
 * appears in the `collaborators` array with the specified role(s).
 * Returns false if no user is present.
 *
 * NEVER returns true — always a Where or false.
 * Compose with or() and asAdmin() for full access control.
 *
 * Uses dot notation on the nested array — Payload resolves this at DB level,
 * no N+1 problem.
 *
 * Accepts a single role or an array of roles. Multiple roles are resolved
 * with `in: []` — a single WHERE clause, not multiple OR branches.
 *
 * @param roles - The collaborator role(s) to match ('editor' | 'viewer')
 *
 * @example
 * // member puede editar si es colaborador editor
 * update: or(asAdmin(orgRole(['owner', 'admin'])), collaborator('editor'))
 *
 * // member puede leer si es colaborador (cualquier rol) — una sola cláusula
 * read: or(asAdmin(orgRole(['owner', 'admin', 'member'])), collaborator(['editor', 'viewer']), () => ({ status: { equals: 'published' } }))
 */
export const collaborator =
  (roles: CollaboratorRole | CollaboratorRole[]): Access =>
  ({ req: { user } }) => {
    if (!user) return false

    const roleList = Array.isArray(roles) ? roles : [roles]

    return {
      and: [
        { 'collaborators.user': { equals: user.id } } as Where,
        { 'collaborators.role': { in: roleList } } as Where,
      ],
    }
  }
