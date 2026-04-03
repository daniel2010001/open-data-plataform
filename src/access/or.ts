import type { Access, AccessArgs, Where } from 'payload'

/**
 * Combina múltiples Access functions con lógica OR.
 *
 * Reglas de composición:
 * - Si alguna retorna `true` → acceso total (true)
 * - Si todas retornan `false` → sin acceso (false)
 * - Si hay mix de `false` y `Where` → combina los Where con `or: []`
 *
 * Esto preserva la semántica correcta de Payload: un Where retornado
 * es un filtro de query, no un boolean. Colapsarlo a true sería un
 * falso positivo de seguridad.
 *
 * @example
 * // Usuario autenticado ve todo; anónimo solo ve los activos
 * read: or(authenticated, () => ({ status: { equals: 'active' } }))
 */
export const or =
  (...accessFns: Access[]): Access =>
  (args: AccessArgs) => {
    const results = accessFns.map((fn) => fn(args))

    // Si alguno permite acceso total, no necesitamos filtrar
    if (results.some((r) => r === true)) return true

    // Separar los Where válidos (descartar los false)
    const wheres = results.filter((r): r is Where => typeof r === 'object' && r !== null)

    if (wheres.length === 0) return false

    // Un solo Where no necesita envoltura or: []
    if (wheres.length === 1) return wheres[0]

    return { or: wheres }
  }
