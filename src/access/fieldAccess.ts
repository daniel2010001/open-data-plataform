import type { FieldAccess } from 'payload'

/**
 * Field access restringido a sysadmins.
 *
 * FieldAccess solo retorna boolean (no Where) — ver access-control.md.
 * Usado en campos sensibles como systemRole, organization, orgRole.
 */
export const sysadminFieldAccess: FieldAccess = ({ req: { user } }) =>
  typeof user?.systemRole === 'string' && user.systemRole === 'sysadmin'
