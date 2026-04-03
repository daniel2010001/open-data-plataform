import type { Access } from 'payload'

/**
 * Returns a Where constraint scoped to the current user's own document (by id).
 * Returns false if no user is present.
 *
 * NEVER returns true — always a Where or false.
 * Compose with asAdmin() to add sysadmin bypass.
 *
 * @example
 * update: asAdmin(self)
 */
export const self: Access = ({ req: { user } }) => {
  if (!user) return false
  return { id: { equals: user.id } }
}
