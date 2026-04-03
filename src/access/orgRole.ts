import type { User } from '@/payload-types'
import type { Access } from 'payload'

/**
 * Returns a Where constraint scoped to the user's organization, if the user
 * has one of the allowed orgRoles. Returns false otherwise.
 *
 * NEVER returns true — always a Where or false.
 * This keeps the function pure and composable with asAdmin().
 *
 * Requires the document to have an `organization` field with the org ID.
 * Uses a query constraint (not async) to avoid N+1 — see access-control-advanced.md.
 *
 * @param roles   - orgRoles allowed to access (e.g. ['owner', 'admin'])
 * @param orgField - document field that holds the org reference (default: 'organization')
 *
 * @example
 * create: asAdmin(orgRole(['owner', 'admin']))
 * read:   or(asAdmin(orgRole(['owner', 'admin', 'member'])), () => ({ status: { equals: 'published' } }))
 */
export const orgRole =
  (roles: (User['orgRole'] & {})[], orgField = 'organization'): Access =>
  ({ req: { user } }) => {
    if (!user?.orgRole || !roles.includes(user.orgRole)) return false

    const orgId = typeof user.organization === 'object' ? user.organization?.id : user.organization

    if (!orgId) return false

    return { [orgField]: { equals: orgId } }
  }
