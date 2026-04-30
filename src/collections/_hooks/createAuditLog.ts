import type { PayloadRequest } from 'payload'

/**
 * Catálogo de acciones de AuditLog — tipo exhaustivo.
 * Único lugar de verdad para los valores de `action`.
 */
export type AuditAction =
  // Datasets — flujo editorial
  | 'DATASET_SUBMITTED_FOR_REVIEW'
  | 'DATASET_APPROVED'
  | 'DATASET_REJECTED'
  | 'DATASET_RETURNED_TO_DRAFT'
  // Datasets — visibilidad
  | 'DATASET_VISIBILITY_ELEVATED'
  | 'DATASET_VISIBILITY_DEGRADED'
  | 'DATASET_VISIBILITY_REDUCED_BY_REVIEWER'
  // Datasets — estados operativos
  | 'DATASET_ARCHIVED'
  | 'DATASET_UNARCHIVED'
  | 'DATASET_DISABLED'
  | 'DATASET_ENABLED'
  | 'DATASET_SOFT_DELETED'
  | 'DATASET_RESTORED'
  | 'DATASET_CLONED'
  // Purge
  | 'PURGE_REQUESTED'
  | 'PURGE_EXECUTED'
  // Collaborators
  | 'COLLABORATOR_ADDED'
  | 'COLLABORATOR_REMOVED'
  | 'COLLABORATOR_ROLE_CHANGED'
  | 'STEWARD_ASSIGNED'
  | 'STEWARD_REVOKED'
  // Resources
  | 'RESOURCE_VISIBILITY_CHANGED'
  | 'RESOURCE_VISIBILITY_REDUCED_BY_REVIEWER'
  | 'RESOURCE_ARCHIVED'
  | 'RESOURCE_DISABLED'
  | 'RESOURCE_SOFT_DELETED'
  | 'RESOURCE_RESTORED'
  | 'PURGE_RESOURCE'
  // Organizations / Users / Membresías
  | 'ORG_OWNERSHIP_TRANSFERRED'
  | 'ORG_DISABLED'
  | 'USER_DEACTIVATED'
  | 'USER_ROLE_CHANGED'
  | 'MEMBERSHIP_CREATED'
  | 'MEMBERSHIP_REMOVED'

export type AuditTargetType =
  | 'dataset'
  | 'resource'
  | 'organization'
  | 'user'
  | 'org_membership'

/**
 * Acciones que requieren `reason` obligatorio (R6 del spec AuditLog).
 */
export const AUDIT_ACTIONS_WITH_REQUIRED_REASON = new Set<AuditAction>([
  'DATASET_REJECTED',
  'DATASET_VISIBILITY_DEGRADED',
  'DATASET_VISIBILITY_REDUCED_BY_REVIEWER',
  'DATASET_ARCHIVED',
  'DATASET_UNARCHIVED',
  'DATASET_DISABLED',
  'DATASET_ENABLED',
  'DATASET_SOFT_DELETED',
  'DATASET_RESTORED',
  'PURGE_REQUESTED',
  'PURGE_EXECUTED',
  'STEWARD_ASSIGNED',
  'STEWARD_REVOKED',
  'RESOURCE_VISIBILITY_CHANGED',
  'RESOURCE_VISIBILITY_REDUCED_BY_REVIEWER',
  'RESOURCE_ARCHIVED',
  'RESOURCE_DISABLED',
  'RESOURCE_SOFT_DELETED',
  'RESOURCE_RESTORED',
  'PURGE_RESOURCE',
  'ORG_OWNERSHIP_TRANSFERRED',
  'ORG_DISABLED',
  'USER_DEACTIVATED',
])

export interface CreateAuditLogInput {
  action: AuditAction
  actor: number | string
  targetType: AuditTargetType
  targetId: string | number
  organizationId?: number | string | null
  payload?: Record<string, unknown>
  reason?: string
}

/**
 * Helper compartido para crear entradas de AuditLog desde cualquier hook.
 *
 * Usa `overrideAccess: true` para saltear las restricciones de `create`
 * (que es sysadmin-only desde la API pública) — los hooks internos tienen
 * acceso irrestricto a la colección.
 *
 * R8 — Si no hay actor identificado, lanza error en lugar de crear entrada sin actor.
 */
export async function createAuditLog(
  req: PayloadRequest,
  input: CreateAuditLogInput,
): Promise<void> {
  if (!input.actor) {
    throw new Error(
      'AuditLog requiere un actor identificado. No se registran eventos de sistema sin actor. (R8)',
    )
  }

  await req.payload.create({
    collection: 'audit-logs',
    data: {
      action: input.action,
      actor: Number(input.actor),
      targetType: input.targetType,
      targetId: String(input.targetId),
      organizationId: input.organizationId != null ? Number(input.organizationId) : null,
      payload: input.payload ?? {},
      reason: input.reason ?? null,
    },
    overrideAccess: true,
    req,
  })
}
