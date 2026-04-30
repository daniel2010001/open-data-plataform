import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

import { allow, allowIf, isSysadmin, isAuthenticated, sysadminOnly } from '@/access'
import { hasOrgRole } from '@/access/guards'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'
import { datasetsAfterCreate } from './hooks/afterCreate'
import { datasetsBeforeChange } from './hooks/beforeChange'
import { datasetsBeforeDelete } from './hooks/beforeDelete'

export const Datasets: CollectionConfig = {
  slug: 'datasets',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    // Solo owner o admin de una org pueden crear datasets en su org
    create: allowIf(hasOrgRole(['owner', 'admin'])),

    // Sysadmin: todos. Owner/admin: los de su org (excepto disabled). Collaborator activo: ese dataset.
    read: allow(
      allowIf(isSysadmin),
      // Owner/admin ven todos los de su org excepto deletedAt — disabled incluido (R9: owner puede ver disabled)
      allowIf(hasOrgRole(['owner']), (args): Where => ({
        and: [
          { organization: { equals: args.req.user.organization } },
          { deletedAt: { exists: false } },
        ],
      })),
      // Admin: igual que owner pero no puede ver disabled (R9 — solo sysadmin y owner)
      allowIf(hasOrgRole(['admin']), (args): Where => ({
        and: [
          { organization: { equals: args.req.user.organization } },
          { deletedAt: { exists: false } },
          { status: { not_equals: 'disabled' } },
        ],
      })),
      // Collaborator activo: ese dataset, sin deletedAt, sin disabled
      allowIf(isAuthenticated, (args): Where => ({
        and: [
          { 'collaborators.user': { equals: args.req.user.id } },
          { 'collaborators.revokedAt': { exists: false } },
          { deletedAt: { exists: false } },
          { status: { not_equals: 'disabled' } },
        ],
      })),
    ),

    // Steward, editor, owner, admin — guards de contenido en beforeChange hook
    update: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin']), (args): Where => ({
        organization: { equals: args.req.user.organization },
      })),
      allowIf(isAuthenticated, (args): Where => ({
        and: [
          { 'collaborators.user': { equals: args.req.user.id } },
          { 'collaborators.revokedAt': { exists: false } },
          { deletedAt: { exists: false } },
        ],
      })),
    ),

    // Nunca delete real — soft-delete via deletedAt (R10). beforeDelete guarda la última línea.
    delete: allowIf(isSysadmin),
  },
  hooks: {
    beforeChange: [assignCreatedBy, datasetsBeforeChange],
    afterChange: [datasetsAfterCreate],
    beforeDelete: [datasetsBeforeDelete],
  },
  fields: [
    // --- Identidad ---
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    // Slug generado desde 'title'. Unique global en la tabla.
    slugField({ useAsSlug: 'title' }),
    {
      name: 'summary',
      type: 'textarea',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
    },

    // --- Organización y taxonomía ---
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },

    // --- Licencia ---
    {
      name: 'license',
      type: 'select',
      options: [
        { label: 'CC BY 4.0', value: 'cc-by' },
        { label: 'CC BY-SA 4.0', value: 'cc-by-sa' },
        { label: 'CC BY-NC 4.0', value: 'cc-by-nc' },
        { label: 'ODC-BY', value: 'odc-by' },
        { label: 'ODbL', value: 'odbl' },
        { label: 'Dominio Público', value: 'public-domain' },
        { label: 'Otro', value: 'other' },
      ],
    },
    {
      name: 'licenseCustom',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.license === 'other',
        description: 'Descripción de la licencia personalizada — requerido si licencia es "Otro".',
      },
    },

    // --- Estados ---
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Activo', value: 'active' },
        { label: 'Archivado', value: 'archived' },
        { label: 'Deshabilitado', value: 'disabled' },
      ],
      access: {
        // Solo owner o sysadmin pueden cambiar el estado operativo
        update: sysadminOnly,
      },
    },
    {
      name: 'editorialStatus',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Borrador', value: 'draft' },
        { label: 'En revisión', value: 'in_review' },
        { label: 'Aprobado', value: 'approved' },
        { label: 'Rechazado', value: 'rejected' },
      ],
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'private',
      options: [
        { label: 'Privado', value: 'private' },
        { label: 'Solo org', value: 'org_only' },
        { label: 'Público', value: 'public' },
      ],
    },
    {
      // Solicitud de elevación de visibilidad por el steward (R7).
      // El owner aprueba seteando `visibility` al valor de este campo y limpiando la solicitud.
      name: 'visibilityRequest',
      type: 'select',
      options: [
        { label: 'Solo org', value: 'org_only' },
        { label: 'Público', value: 'public' },
      ],
      admin: {
        description: 'Visibilidad solicitada por el steward. El owner aprueba o rechaza.',
        condition: (_, siblingData) => Boolean(siblingData?.id),
      },
    },
    {
      name: 'visibilityRequestedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Fecha en que el steward hizo la solicitud de visibilidad.',
        condition: (_, siblingData) => Boolean(siblingData?.visibilityRequest),
      },
    },

    // --- Collaborators (array embebido) ---
    {
      name: 'collaborators',
      type: 'array',
      admin: {
        // Oculto en create — se asigna el steward vía hook afterCreate
        condition: (_, siblingData) => Boolean(siblingData?.id),
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          options: [
            { label: 'Steward', value: 'steward' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        {
          name: 'assignmentType',
          type: 'select',
          required: true,
          defaultValue: 'direct',
          options: [
            { label: 'Directo', value: 'direct' },
            { label: 'Team', value: 'team' },
          ],
        },
        {
          name: 'teamId',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.assignmentType === 'team',
            description: 'ID del team que originó esta asignación (Plus v1)',
          },
        },
        {
          name: 'orgIdAtAssignment',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Snapshot del orgId del usuario al momento de asignar',
          },
        },
        {
          name: 'assignedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'revokedAt',
          type: 'date',
          admin: {
            description: 'Soft-delete del collaborator — si tiene valor, el acceso fue revocado',
          },
        },
      ],
    },

    // --- Auditoría y modelo ---
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        condition: (_, siblingData) => Boolean(siblingData?.createdBy),
      },
      access: {
        read: sysadminOnly,
        update: sysadminOnly,
      },
    },
    {
      // Clonación — solo para preservar el modelo. Feature activo en v2+.
      name: 'originDatasetId',
      type: 'relationship',
      relationTo: 'datasets',
      hasMany: false,
      admin: {
        description: 'Si este dataset es un clon, referencia al dataset original (v2+)',
        condition: (_, siblingData) => Boolean(siblingData?.originDatasetId),
      },
    },
    {
      // Soft-delete — domina sobre todo (R10). Solo sysadmin puede restaurar.
      name: 'deletedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Soft-delete. Si tiene valor, el dataset está eliminado. Solo sysadmin puede restaurar.',
        condition: (_, siblingData) => Boolean(siblingData?.deletedAt),
      },
      access: {
        update: sysadminOnly,
      },
    },
  ],
  timestamps: true,
}
