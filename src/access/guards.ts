import type { AuthenticatedUser, Context, Guard, OrgRole, Sysadmin, WithUser } from './types'

// ---------------------------------------------------------------------------
// Siempre pasa (fallback público)
// ---------------------------------------------------------------------------

/**
 * Guard que siempre pasa — para usar como primer parámetro de allowIf
 * cuando el acceso no depende de ninguna condición del user.
 *
 * Útil para aplicar un Where estático a requests anónimos:
 *
 * @example
 * // Solo docs activos para el público
 * allowIf(isAnyone, { isActive: { equals: true } })
 */
export const isAnyone: Guard<Context, Context> = (args): args is Context => true

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

/** ¿Hay usuario autenticado? Refina Context → Context & WithUser */
export const isAuthenticated: Guard<Context, Context & WithUser> = (
  args,
): args is Context & WithUser => Boolean(args.req.user)

// ---------------------------------------------------------------------------
// Roles globales
// ---------------------------------------------------------------------------

/** ¿Es sysadmin? Refina Context → Context & Sysadmin */
export const isSysadmin: Guard<Context, Context & Sysadmin> = (
  args,
): args is Context & Sysadmin =>
  isAuthenticated(args) && (args.req.user as AuthenticatedUser).systemRole === 'sysadmin'

// ---------------------------------------------------------------------------
// Roles por organización (dependen del JWT — disponibles desde Fase 2)
// ---------------------------------------------------------------------------

/**
 * ¿Tiene uno de los orgRoles indicados y tiene org asignada en el JWT?
 * Refina Context → Context & OrgRole<R>.
 *
 * IMPORTANTE: este guard solo funciona correctamente después de que la Fase 2
 * (autenticación) inyecte orgRole y organization en el JWT. En Fase 1 siempre
 * retorna false para cualquier usuario que no sea sysadmin.
 *
 * No hace bypass de sysadmin — eso lo maneja dsl.ts con allowIf(isSysadmin).
 * Este guard es puro: solo chequea orgRole y organization presentes.
 */
export const hasOrgRole =
  <R extends NonNullable<AuthenticatedUser['orgRole']>>(roles: R[]) =>
  (args: Context): args is Context & OrgRole<R> => {
    if (!isAuthenticated(args)) return false
    const user = args.req.user as AuthenticatedUser
    return !!user.orgRole && !!user.organization && roles.includes(user.orgRole as R)
  }

// ---------------------------------------------------------------------------
// Helper de extracción
// ---------------------------------------------------------------------------

/**
 * Extrae el orgId del user ya validado por hasOrgRole.
 * Solo llamar después de pasar hasOrgRole — garantiza que organization existe.
 * Retorna string (UUID) — nunca number.
 */
export const getOrgId = (user: AuthenticatedUser & { organization: string }): string =>
  user.organization
