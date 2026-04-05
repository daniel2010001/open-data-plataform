import type { Access } from 'payload'

/**
 * Returns a Where constraint scoped to documents where the current user
 * is the `owner` field of the document.
 * Returns false if no user is present.
 *
 * NEVER returns true — always a Where or false.
 * Compose with asAdmin() to add sysadmin bypass.
 *
 * Does NOT depend on orgRole in the JWT — ownership is determined by the
 * document's `owner` field, not the user's role. This is the single source
 * of truth for org ownership.
 *
 * Used in Organizations.access.update — the org owner and admins can manage
 * their own organization without being sysadmin.
 *
 * @example
 * update: asAdmin(or(orgOwner, orgRole(['admin'])))
 */
export const orgOwner: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}
