import type { User, Organization, OrgMembership } from '@/payload-types'

/**
 * Roles de org inferidos desde la collection OrgMemberships — único lugar de verdad.
 * Si se agrega un rol en la collection, este tipo se actualiza con generate:types.
 */
export type OrgRoleValue = OrgMembership['orgRole']

/**
 * Roles de sistema inferidos desde la collection Users.
 * Igual principio: un solo lugar de verdad.
 */
export type SystemRoleValue = NonNullable<User['systemRole']>

/**
 * Extensión del User autenticado con campos derivados de OrgMemberships.
 * Estos campos NO son parte de la collection Users — se inyectan en cada
 * request via middleware (Fase 2) consultando la DB, no el JWT.
 *
 * systemRole NO se redeclara aquí — ya viene en User con el tipo correcto
 * y no es opcional. Extender con "?" lo debilitaría.
 */
export type AuthenticatedUser = User & {
  orgRole?: OrgRoleValue
  organization?: Organization['id']
}

/**
 * Contexto genérico de entrada — lo mínimo que necesitan los guards.
 * Compatible con AccessArgs<T>, FieldAccessArgs<T>, y cualquier función
 * que reciba { req: { user? } }.
 */
export type Context<U = unknown> = { req: { user?: U } }

/**
 * Refinamiento: contexto con user garantizado (autenticado).
 * Usa AuthenticatedUser para incluir orgRole y organization del request.
 */
export type WithUser = { req: { user: AuthenticatedUser } }

/** User con systemRole sysadmin */
export type Sysadmin = WithUser & {
  req: { user: AuthenticatedUser & { systemRole: 'sysadmin' } }
}

/**
 * User con un orgRole específico y organización presente en el request.
 * R preserva el tipo exacto del rol — no colapsa a la union completa.
 */
export type OrgRole<R extends NonNullable<OrgRoleValue>> = WithUser & {
  req: { user: AuthenticatedUser & { orgRole: R; organization: Organization['id'] } }
}

/**
 * Tipo base de un guard: una type predicate function que refina T → R.
 * Retorna boolean — nunca Where. Los Where se construyen en dsl.ts.
 */
export type Guard<T, R extends T> = (args: T) => args is R
