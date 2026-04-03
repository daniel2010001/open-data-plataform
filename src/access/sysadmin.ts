import type { Access } from 'payload'

export const sysadmin: Access = ({ req: { user } }) =>
  typeof user?.systemRole === 'string' && user.systemRole === 'sysadmin'
