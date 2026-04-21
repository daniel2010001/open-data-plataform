import type { Access, Where } from 'payload'

import type { Context, Guard } from './types'

// ---------------------------------------------------------------------------
// allowIf — primitivo central
// ---------------------------------------------------------------------------

/**
 * Construye una Access function a partir de un guard y un build opcional.
 *
 * El segundo parámetro acepta tres formas:
 *   - omitido           → retorna true si el guard pasa
 *   - Where estático    → retorna ese Where si el guard pasa (sin acceso al user)
 *   - función dinámica  → recibe args ya refinados por el guard, retorna boolean | Where
 *
 * @example
 * // Solo autenticado
 * allowIf(isAuthenticated)
 *
 * // Sysadmin con acceso total
 * allowIf(isSysadmin)
 *
 * // OrgRole con filtro dinámico (usa el orgId del user del JWT)
 * allowIf(hasOrgRole(['admin']), (args) => ({
 *   organization: { equals: getOrgId(args.req.user) },
 * }))
 */
export const allowIf =
  <R extends Context>(
    guard: Guard<Context, R>,
    build?: ((args: R) => boolean | Where) | Where,
  ): Access =>
  (args) => {
    if (!guard(args)) return false
    if (!build) return true
    if (typeof build === 'function') return build(args)
    return build
  }

// ---------------------------------------------------------------------------
// allow — pipeline de reglas OR
// ---------------------------------------------------------------------------

/**
 * Combina múltiples Access functions con lógica OR.
 *
 * Semántica:
 *   - Primera regla que retorne true  → acceso total, para inmediatamente
 *   - Primera regla que retorne Where → retorna ese Where, para inmediatamente
 *   - Todas retornan false            → false
 *
 * El orden importa: poné sysadmin primero para short-circuit rápido.
 *
 * @example
 * read: allow(
 *   allowIf(isSysadmin),
 *   allowIf(hasOrgRole(['owner', 'admin']), (args) => ({
 *     organization: { equals: getOrgId(args.req.user) },
 *   })),
 * )
 */
export const allow =
  (...rules: Access[]): Access =>
  (args) => {
    for (const rule of rules) {
      const res = rule(args)
      if (res === true) return true
      if (res && typeof res === 'object') return res
    }
    return false
  }

// ---------------------------------------------------------------------------
// anyone — acceso público sin guard
// ---------------------------------------------------------------------------

/** Acceso total sin restricciones. Para endpoints y colecciones públicas. */
export const anyone: Access = () => true
