import type { CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload'

import { allow, allowIf, isSysadmin, sysadminOnly } from '@/access'
import { hasOrgRole } from '@/access/guards'
import {
  AUDIT_ACTIONS_WITH_REQUIRED_REASON,
  type AuditAction,
} from '../_hooks/createAuditLog'

/**
 * R1 — Los registros de AuditLog son inmutables. Bloquear update siempre.
 * R6 — `reason` requerido para las acciones marcadas en el catálogo.
 */
const auditLogBeforeChange: CollectionBeforeChangeHook = ({ operation, data }) => {
  // R1 — inmutable post-creación
  if (operation === 'update') {
    throw new Error('Los registros de AuditLog son inmutables y no pueden modificarse.')
  }

  // R6 — reason obligatorio según catálogo
  const action = data.action as AuditAction | undefined
  if (action && AUDIT_ACTIONS_WITH_REQUIRED_REASON.has(action)) {
    if (!data.reason?.trim()) {
      throw new Error(
        `La acción "${action}" requiere un campo reason no vacío. (R6)`,
      )
    }
  }

  return data
}

/**
 * Catálogo de actions como opciones de select.
 * Se mantiene en sincronía con el tipo AuditAction del helper.
 */
const ACTION_OPTIONS = [
  // Datasets — flujo editorial
  { label: 'Dataset: enviado a revisión', value: 'DATASET_SUBMITTED_FOR_REVIEW' },
  { label: 'Dataset: aprobado', value: 'DATASET_APPROVED' },
  { label: 'Dataset: rechazado', value: 'DATASET_REJECTED' },
  { label: 'Dataset: devuelto a borrador', value: 'DATASET_RETURNED_TO_DRAFT' },
  // Datasets — visibilidad
  { label: 'Dataset: visibilidad elevada', value: 'DATASET_VISIBILITY_ELEVATED' },
  { label: 'Dataset: visibilidad degradada', value: 'DATASET_VISIBILITY_DEGRADED' },
  { label: 'Dataset: visibilidad reducida por reviewer', value: 'DATASET_VISIBILITY_REDUCED_BY_REVIEWER' },
  // Datasets — estados operativos
  { label: 'Dataset: archivado', value: 'DATASET_ARCHIVED' },
  { label: 'Dataset: desarchivado', value: 'DATASET_UNARCHIVED' },
  { label: 'Dataset: deshabilitado', value: 'DATASET_DISABLED' },
  { label: 'Dataset: habilitado', value: 'DATASET_ENABLED' },
  { label: 'Dataset: soft-deleted', value: 'DATASET_SOFT_DELETED' },
  { label: 'Dataset: restaurado', value: 'DATASET_RESTORED' },
  { label: 'Dataset: clonado', value: 'DATASET_CLONED' },
  // Purge
  { label: 'Purge: solicitado', value: 'PURGE_REQUESTED' },
  { label: 'Purge: ejecutado', value: 'PURGE_EXECUTED' },
  // Collaborators
  { label: 'Collaborator: agregado', value: 'COLLABORATOR_ADDED' },
  { label: 'Collaborator: removido', value: 'COLLABORATOR_REMOVED' },
  { label: 'Collaborator: rol cambiado', value: 'COLLABORATOR_ROLE_CHANGED' },
  { label: 'Steward: asignado', value: 'STEWARD_ASSIGNED' },
  { label: 'Steward: revocado', value: 'STEWARD_REVOKED' },
  // Resources
  { label: 'Resource: visibilidad cambiada', value: 'RESOURCE_VISIBILITY_CHANGED' },
  { label: 'Resource: visibilidad reducida por reviewer', value: 'RESOURCE_VISIBILITY_REDUCED_BY_REVIEWER' },
  { label: 'Resource: archivado', value: 'RESOURCE_ARCHIVED' },
  { label: 'Resource: deshabilitado', value: 'RESOURCE_DISABLED' },
  { label: 'Resource: soft-deleted', value: 'RESOURCE_SOFT_DELETED' },
  { label: 'Resource: restaurado', value: 'RESOURCE_RESTORED' },
  { label: 'Resource: purge', value: 'PURGE_RESOURCE' },
  // Organizations / Users / Membresías
  { label: 'Org: ownership transferido', value: 'ORG_OWNERSHIP_TRANSFERRED' },
  { label: 'Org: deshabilitada', value: 'ORG_DISABLED' },
  { label: 'User: desactivado', value: 'USER_DEACTIVATED' },
  { label: 'User: rol cambiado', value: 'USER_ROLE_CHANGED' },
  { label: 'Membership: creada', value: 'MEMBERSHIP_CREATED' },
  { label: 'Membership: removida', value: 'MEMBERSHIP_REMOVED' },
]

export const AuditLog: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'actor', 'targetType', 'targetId', 'createdAt'],
  },
  // Sin updatedAt — R1: registros inmutables
  timestamps: true,
  access: {
    // create: solo desde hooks internos (overrideAccess: true). API pública: sysadmin.
    create: allowIf(isSysadmin),

    // R3 — sysadmin todo. R4 — owner solo su org.
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner']), (args): Where => ({
        organizationId: { equals: args.req.user.organization },
      })),
    ),

    // R1 — nadie puede actualizar
    update: sysadminOnly,

    // R2 — solo sysadmin puede purgar
    delete: allowIf(isSysadmin),
  },
  hooks: {
    beforeChange: [auditLogBeforeChange],
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      options: ACTION_OPTIONS,
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Usuario que realizó la acción. R8: siempre requerido.',
      },
    },
    {
      name: 'targetType',
      type: 'select',
      required: true,
      options: [
        { label: 'Dataset', value: 'dataset' },
        { label: 'Resource', value: 'resource' },
        { label: 'Organization', value: 'organization' },
        { label: 'User', value: 'user' },
        { label: 'OrgMembership', value: 'org_membership' },
      ],
    },
    {
      // text — no FK tipada, la entidad puede ser cualquier collection
      name: 'targetId',
      type: 'text',
      required: true,
      admin: {
        description: 'ID de la entidad afectada.',
      },
    },
    {
      name: 'organizationId',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        description: 'Org a la que pertenece el evento — para filtrado por owner (R4).',
      },
    },
    {
      // R7 — para campos extensos (summary, description) se almacena hash SHA256
      name: 'payload',
      type: 'json',
      admin: {
        description: 'Datos del evento: diff, hashes SHA256 de campos extensos, campos anteriores/nuevos.',
      },
    },
    {
      // R6 — requerido para ciertas acciones, validado en beforeChange
      name: 'reason',
      type: 'textarea',
      admin: {
        description: 'Justificación — requerida para las acciones marcadas en el catálogo (R6).',
      },
    },
  ],
}
