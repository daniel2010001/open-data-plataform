import type { CollectionBeforeChangeHook } from 'payload'
import type { AuthenticatedUser } from '@/access/types'

/**
 * Reglas de DataCollections:
 *
 * R2 — Solo se pueden incluir datasets que pertenezcan a la misma org.
 *       Valida cada dataset en el array `datasets` contra la org de la colección.
 */
export const dataCollectionsBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const user = req.user as AuthenticatedUser
  const isSysadmin = user?.systemRole === 'sysadmin'

  // Sysadmin puede incluir cualquier dataset
  if (isSysadmin) return data

  // Determinar la org de la colección
  const orgId =
    operation === 'create'
      ? (typeof data.organization === 'object'
          ? (data.organization as { id: number }).id
          : data.organization)
      : (typeof originalDoc?.organization === 'object'
          ? (originalDoc.organization as { id: number }).id
          : originalDoc?.organization)

  if (!orgId || !data.datasets || !Array.isArray(data.datasets)) return data

  // Obtener IDs existentes para no re-validar los que ya estaban
  const existingDatasetIds = new Set(
    (originalDoc?.datasets ?? []).map((d: number | { id: number }) =>
      typeof d === 'object' ? d.id : d,
    ),
  )

  for (const dataset of data.datasets as Array<number | { id: number }>) {
    const datasetId = typeof dataset === 'object' ? dataset.id : dataset

    if (existingDatasetIds.has(datasetId)) continue

    const found = await req.payload.findByID({
      collection: 'datasets',
      id: datasetId,
      overrideAccess: true,
    })

    const datasetOrgId =
      typeof found?.organization === 'object'
        ? (found.organization as { id: number }).id
        : found?.organization

    if (!found || datasetOrgId !== orgId) {
      throw new Error(
        `El dataset ${datasetId} no pertenece a esta organización. Solo se pueden incluir datasets de la misma org. (R2)`,
      )
    }
  }

  return data
}
