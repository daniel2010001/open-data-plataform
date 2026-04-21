import type { User } from '@/payload-types'

/**
 * Extensión del User autenticado con campos derivados de OrgMemberships.
 * Estos campos NO son parte de la collection Users — se inyectan en el JWT
 * durante la autenticación (Fase 2). El tipo User generado por Payload no
 * los incluye, por eso viven acá como extensión explícita.
 *
 * systemRole se extiende aquí también porque Payload genera el tipo User
 * sin los campos custom hasta que se regenera payload-types.ts.
 */
export type AuthenticatedUser = User & {
  systemRole?: 'sysadmin' | 'user'
  orgRole?: 'owner' | 'admin' | 'member'
  organization?: string // UUID string — nunca number
}

/**
 * Contexto genérico de entrada — lo mínimo que necesitan los guards.
 * Compatible con AccessArgs<T>, FieldAccessArgs<T>, y cualquier función
 * que reciba { req: { user? } }.
 */
export type Context<U = unknown> = { req: { user?: U } }

/**
 * Refinamiento: contexto con user garantizado (autenticado).
 * Usa AuthenticatedUser para incluir orgRole y organization del JWT.
 */
export type WithUser = { req: { user: AuthenticatedUser } }

/** User con systemRole sysadmin */
export type Sysadmin = WithUser & {
  req: { user: AuthenticatedUser & { systemRole: 'sysadmin' } }
}

/**
 * User con un orgRole específico y organización presente en el JWT.
 * R preserva el tipo exacto del rol — no colapsa a la union completa.
 */
export type OrgRole<R extends NonNullable<AuthenticatedUser['orgRole']>> = WithUser & {
  req: { user: AuthenticatedUser & { orgRole: R; organization: string } }
}

/**
 * Tipo base de un guard: una type predicate function que refina T → R.
 * Retorna boolean — nunca Where. Los Where se construyen en dsl.ts.
 */
export type Guard<T, R extends T> = (args: T) => args is R
