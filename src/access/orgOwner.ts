import type { Access } from 'payload'

/**
 * Returns a Where constraint scoped to documents where the current user
 * is the `owner` AND has orgRole 'owner' or 'admin'.
 * Returns false otherwise.
 *
 * NEVER returns true — always a Where or false.
 * Compose with asAdmin() to add sysadmin bypass.
 *
 * Used in Organizations.access.update — org admins/owners can manage
 * their own organization without being sysadmin.
 *
 * @example
 * update: asAdmin(orgOwner)
 */
export const orgOwner: Access = ({ req: { user } }) => {
  if (!user) return false

  const { orgRole } = user
  if (orgRole === 'owner' || orgRole === 'admin') {
    return { owner: { equals: user.id } }
  }

  return false
}
