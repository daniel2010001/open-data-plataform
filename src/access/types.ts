import type { User } from '@/payload-types'

/**
 * Contexto genérico de entrada — lo mínimo que necesitan los guards.
 * Compatible con AccessArgs<T>, FieldAccessArgs<T>, y cualquier función
 * que reciba { req: { user? } }.
 */
export type Context<U = unknown> = { req: { user?: U } }

/**
 * Refinamiento: contexto con user garantizado (autenticado).
 * U por defecto es User del proyecto.
 */
export type WithUser<U extends User = User> = { req: { user: U } }

/** User con systemRole sysadmin */
export type Sysadmin = WithUser<User & { systemRole: 'sysadmin' }>

/**
 * User con un orgRole específico y organización presente.
 * R preserva el tipo exacto del rol — no colapsa a la union completa.
 */
export type OrgRole<R extends NonNullable<User['orgRole']>> = WithUser<
  User & { orgRole: R; organization: NonNullable<User['organization']> }
>

/**
 * Tipo base de un guard: una type predicate function que refina T → R.
 * Retorna boolean — nunca Where. Los Where se construyen en dsl.ts.
 */
export type Guard<T, R extends T> = (args: T) => args is R
