import type { FieldAccess } from 'payload'

import { hasOrgRole, isAuthenticated, isSysadmin } from './guards'

/**
 * Factory que genera un FieldAccess basado en guards.
 *
 * FieldAccess solo retorna boolean (no Where) — ver access-control.md.
 *
 * Construido sobre los mismos guards que Access — un solo lugar de verdad
 * para la lógica de roles. Cambiar isSysadmin o hasOrgRole actualiza todo.
 *
 * @param options.roles         - orgRoles permitidos además de sysadmin (default: [])
 * @param options.allowSelf     - permite que el propio user edite su campo (default: false)
 * @param options.allowSysadmin - sysadmin siempre puede (default: true)
 *
 * @example
 * // Solo sysadmin
 * fieldAccessFor()
 *
 * // Owner o sysadmin
 * fieldAccessFor({ roles: ['owner'] })
 *
 * // El propio user o sysadmin (para campos como email)
 * fieldAccessFor({ allowSelf: true })
 */
export const fieldAccessFor =
  ({
    roles = [],
    allowSelf = false,
    allowSysadmin = true,
  }: {
    roles?: NonNullable<import('@/payload-types').User['orgRole']>[]
    allowSelf?: boolean
    allowSysadmin?: boolean
  } = {}): FieldAccess =>
  (args) => {
    if (!isAuthenticated(args)) return false
    if (allowSysadmin && isSysadmin(args)) return true
    if (allowSelf && args.doc?.id && String(args.doc.id) === String(args.req.user.id)) return true
    if (roles.length > 0 && hasOrgRole(roles)(args)) return true
    return false
  }

// ---------------------------------------------------------------------------
// Aliases de conveniencia
// ---------------------------------------------------------------------------

/** Solo sysadmin */
export const sysadminFieldAccess: FieldAccess = fieldAccessFor()

/** Owner o sysadmin */
export const orgOwnerFieldAccess: FieldAccess = fieldAccessFor({ roles: ['owner'] })

/** Owner, admin o sysadmin */
export const orgAdminFieldAccess: FieldAccess = fieldAccessFor({ roles: ['owner', 'admin'] })

/** El propio user o sysadmin */
export const selfOrSysadminFieldAccess: FieldAccess = fieldAccessFor({ allowSelf: true })
