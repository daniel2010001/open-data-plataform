import type { FieldAccess } from 'payload'

/**
 * Field access restringido a sysadmins.
 *
 * FieldAccess solo retorna boolean (no Where) — ver access-control.md.
 * Usado en campos sensibles como systemRole, organization, orgRole.
 */
export const sysadminFieldAccess: FieldAccess = ({ req: { user } }) =>
  typeof user?.systemRole === 'string' && user.systemRole === 'sysadmin'

/**
 * Field access para campos editables por el owner de la org del documento O por sysadmin.
 *
 * Verifica que el user autenticado pertenezca a la misma organización que el documento
 * que se está editando (usando doc.organization). Si el user es sysadmin, siempre permite.
 *
 * Usado en campos de Users: orgRole, canCreateDatasets — el owner puede gestionar
 * los roles de los users de SU org, pero no de otras orgs.
 *
 * IMPORTANTE: este check verifica la org del doc (el user editado), no la del user activo.
 * La validación de que el user activo sea el owner de esa org se hace via collection-level
 * access (create: asAdmin(orgOwner)) — este fieldAccess es la segunda capa.
 *
 * @example
 * orgRole: { update: orgOwnerOrSysadminFieldAccess }
 */
export const orgOwnerOrSysadminFieldAccess: FieldAccess = ({ req: { user }, doc }) => {
  if (!user) return false
  if (user.systemRole === 'sysadmin') return true

  // doc es el user que se está editando — verificamos que pertenece a la misma org
  const docOrg = typeof doc?.organization === 'object' ? doc?.organization?.id : doc?.organization
  const userOrg = typeof user.organization === 'object' ? user.organization?.id : user.organization

  if (!docOrg || !userOrg) return false

  return String(docOrg) === String(userOrg)
}
