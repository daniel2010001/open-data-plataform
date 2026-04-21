import type { FieldAccess } from 'payload'

import type { AuthenticatedUser } from './types'
import { hasOrgRole, isAuthenticated, isSysadmin } from './guards'

/**
 * Factory que genera un FieldAccess basado en guards.
 *
 * FieldAccess solo retorna boolean (no Where).
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
 * // El propio user o sysadmin (para campos como name, email)
 * fieldAccessFor({ allowSelf: true })
 */
export const fieldAccessFor =
  ({
    roles = [],
    allowSelf = false,
    allowSysadmin = true,
  }: {
    roles?: NonNullable<AuthenticatedUser['orgRole']>[]
    allowSelf?: boolean
    allowSysadmin?: boolean
  } = {}): FieldAccess =>
  (args) => {
    if (!isAuthenticated(args)) return false
    if (allowSysadmin && isSysadmin(args)) return true
    if (allowSelf && args.doc?.id && String(args.doc.id) === String(args.req.user?.id))
      return true
    if (roles.length > 0 && hasOrgRole(roles)(args)) return true
    return false
  }

// ---------------------------------------------------------------------------
// Aliases de conveniencia
// ---------------------------------------------------------------------------

/** Solo sysadmin puede leer/modificar */
export const sysadminOnly: FieldAccess = fieldAccessFor()

/** Owner o sysadmin */
export const ownerOrSysadmin: FieldAccess = fieldAccessFor({ roles: ['owner'] })

/** Owner, admin o sysadmin */
export const adminOrSysadmin: FieldAccess = fieldAccessFor({ roles: ['owner', 'admin'] })

/** El propio user o sysadmin */
export const selfOrSysadmin: FieldAccess = fieldAccessFor({ allowSelf: true })
