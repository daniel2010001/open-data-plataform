import type { Access } from 'payload'

import type { User } from '@/payload-types'

import type { Context, Guard, OrgRole, Sysadmin, WithUser } from './types'

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
 * // Fallback público: solo docs publicados
 * allowIf(isAnyone, { status: { equals: 'published' } })
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
export const isSysadmin: Guard<Context, Context & Sysadmin> = (args): args is Context & Sysadmin =>
  isAuthenticated(args) && args.req.user.systemRole === 'sysadmin'

// ---------------------------------------------------------------------------
// Roles por organización
// ---------------------------------------------------------------------------

/**
 * ¿Tiene uno de los orgRoles indicados y tiene org asignada?
 * Refina Context → Context & OrgRole<R>.
 *
 * No hace bypass de sysadmin — eso lo maneja dsl.ts con allowIf(isSysadmin).
 * Este guard es puro: solo chequea orgRole y org presentes.
 */
export const hasOrgRole =
  <R extends NonNullable<User['orgRole']>>(roles: R[]) =>
  (args: Context): args is Context & OrgRole<R> =>
    isAuthenticated(args) &&
    !!args.req.user.orgRole &&
    !!args.req.user.organization &&
    roles.includes(args.req.user.orgRole as R)

// ---------------------------------------------------------------------------
// Ownership por documento
// ---------------------------------------------------------------------------

/**
 * Access function que retorna { owner: { equals: user.id } }.
 * No es un type predicate — es una Access function directa.
 *
 * Usado en Organizations donde el ownership está en el campo `owner` del
 * documento, no en el `orgRole` del JWT.
 *
 * Siempre compose con allowIf(isSysadmin) primero dentro de allow().
 *
 * @example
 * update: allow(allowIf(isSysadmin), isOrgOwner)
 */
export const isOrgOwner: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}

// ---------------------------------------------------------------------------
// Helper de extracción
// ---------------------------------------------------------------------------

/**
 * Extrae el orgId del user ya validado por hasOrgRole.
 * Solo llamar después de pasar hasOrgRole — garantiza que organization existe.
 */
export const getOrgId = (
  user: User & { organization: NonNullable<User['organization']> },
): number => (typeof user.organization === 'object' ? user.organization.id : user.organization)
