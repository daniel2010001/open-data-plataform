import type { Guard } from './types'

/**
 * AND — encadena dos guards. El tipo resultante es la intersección C ⊆ B ⊆ A.
 *
 * @example
 * const isOrgAdmin = and(isAuthenticated, hasOrgRole(['admin']))
 */
export const and =
  <A, B extends A, C extends B>(g1: Guard<A, B>, g2: Guard<B, C>): Guard<A, C> =>
  (args: A): args is C =>
    g1(args) && g2(args as B)

/**
 * OR — une dos guards. El tipo resultante es la unión B | C.
 *
 * @example
 * const isSysadminOrOwner = or(isSysadmin, hasOrgRole(['owner']))
 */
export const or =
  <A, B extends A, C extends A>(g1: Guard<A, B>, g2: Guard<A, C>): Guard<A, B | C> =>
  (args: A): args is B | C =>
    g1(args) || g2(args)

/**
 * NOT — invierte un guard. Útil para exclusiones explícitas.
 *
 * @example
 * const notSysadmin = not(isSysadmin)
 */
export const not =
  <A, B extends A>(g: Guard<A, B>) =>
  (args: A): args is Exclude<A, B> =>
    !g(args)
