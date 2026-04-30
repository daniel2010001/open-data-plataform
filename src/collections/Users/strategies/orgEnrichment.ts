import type { AuthStrategyFunction } from 'payload'
import { extractJWT, JWTAuthentication } from 'payload'

/**
 * Estrategia de autenticación custom para la collection Users.
 *
 * Corre en CADA request autenticado, antes de que req.user sea asignado.
 * Responsabilidades:
 *   1. Delegar verificación del JWT a JWTAuthentication (Payload default)
 *   2. Bloquear usuarios con isActive: false → retorna { user: null }
 *   3. Consultar OrgMemberships activas y enriquecer el user con:
 *        - orgRole: el rol del user en su organización activa
 *        - organization: el ID de esa organización
 *
 * Este diseño mantiene orgRole/organization fuera del JWT (no stale),
 * y los inyecta por request desde la DB — requerimiento de la Fase 2.
 */
export const orgEnrichmentStrategy: AuthStrategyFunction = async (args) => {
  // 1. Verificar JWT y cargar el user base (comportamiento default de Payload)
  const result = await JWTAuthentication(args)

  // No autenticado — pasar sin modificar
  if (!result.user) return result

  const { user, responseHeaders } = result
  const { payload } = args

  // 2. Bloquear users inactivos — isActive: false no debe poder operar
  if (user.isActive === false) {
    return { user: null, responseHeaders }
  }

  // 3. Buscar OrgMembership activa del user
  //    Tomamos la primera que encuentre — en v1 un user pertenece a una sola org
  const memberships = await payload.find({
    collection: 'org-memberships',
    where: {
      user: { equals: user.id },
    },
    limit: 1,
    depth: 0, // Solo IDs — no necesitamos el doc completo de organization
  })

  const membership = memberships.docs[0]

  if (!membership) {
    // User autenticado pero sin org — orgRole y organization quedan undefined
    // Los guards como hasOrgRole retornarán false correctamente
    return { user, responseHeaders }
  }

  // 4. Enriquecer req.user con los campos derivados de OrgMemberships
  //    Estos campos NO existen en la collection Users — son runtime-only
  const enrichedUser = {
    ...user,
    orgRole: membership.orgRole,
    // organization puede ser un objeto si depth > 0, pero con depth:0 es siempre ID
    organization:
      typeof membership.organization === 'object'
        ? membership.organization.id
        : membership.organization,
  }

  return { user: enrichedUser, responseHeaders }
}
