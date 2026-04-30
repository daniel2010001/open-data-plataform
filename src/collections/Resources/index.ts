import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

import { allow, allowIf, isSysadmin, isAuthenticated, sysadminOnly } from '@/access'
import { hasOrgRole } from '@/access/guards'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'
import { resourcesBeforeChange } from './hooks/beforeChange'
import { resourcesBeforeDelete } from './hooks/beforeDelete'

export const Resources: CollectionConfig = {
  slug: 'resources',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    // Steward/editor activo en el dataset, owner/admin de la org, o sysadmin
    create: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin'])),
      // Collaborator activo con rol steward o editor puede crear resources
      allowIf(isAuthenticated),
    ),

    // Hereda del dataset — sysadmin todo, owner/admin de la org, collaborator activo
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner']), (args): Where => ({
        and: [
          { 'dataset.organization': { equals: args.req.user.organization } },
          { deletedAt: { exists: false } },
          { excludeFromNextVersion: { not_equals: true } },
        ],
      })),
      allowIf(hasOrgRole(['admin']), (args): Where => ({
        and: [
          { 'dataset.organization': { equals: args.req.user.organization } },
          { deletedAt: { exists: false } },
          { excludeFromNextVersion: { not_equals: true } },
          { 'dataset.status': { not_equals: 'disabled' } },
        ],
      })),
      // Collaborator activo en el dataset
      allowIf(isAuthenticated, (args): Where => ({
        and: [
          { 'dataset.collaborators.user': { equals: args.req.user.id } },
          { 'dataset.collaborators.revokedAt': { exists: false } },
          { deletedAt: { exists: false } },
          { excludeFromNextVersion: { not_equals: true } },
        ],
      })),
    ),

    // Mismo que create
    update: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin'])),
      allowIf(isAuthenticated, (args): Where => ({
        and: [
          { 'dataset.collaborators.user': { equals: args.req.user.id } },
          { 'dataset.collaborators.revokedAt': { exists: false } },
          { deletedAt: { exists: false } },
        ],
      })),
    ),

    // Soft-delete via deletedAt. Hard delete solo sysadmin — beforeDelete guarda la lógica.
    delete: allowIf(isSysadmin),
  },
  hooks: {
    beforeChange: [assignCreatedBy, resourcesBeforeChange],
    beforeDelete: [resourcesBeforeDelete],
  },
  fields: [
    // --- Relación con dataset ---
    {
      name: 'dataset',
      type: 'relationship',
      relationTo: 'datasets',
      required: true,
      admin: {
        description: 'Dataset al que pertenece este resource.',
      },
    },

    // --- Identidad ---
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({ useAsSlug: 'title' }),
    {
      name: 'description',
      type: 'textarea',
    },

    // --- Tipo de recurso (inmutable post-creación — R4) ---
    {
      name: 'resourceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Archivo', value: 'file' },
        { label: 'Enlace externo', value: 'link' },
      ],
      admin: {
        description: 'Tipo del recurso. No puede modificarse después de creado.',
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
        update: sysadminOnly,
      },
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

    // --- Campos de archivo (condicionales si resourceType === 'file') ---
    {
      name: 'fileStorageKey',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.resourceType === 'file',
        description: 'Clave del archivo en el storage (S3 key, ruta, etc.).',
      },
    },
    {
      name: 'fileSize',
      type: 'number',
      admin: {
        condition: (_, siblingData) => siblingData?.resourceType === 'file',
        description: 'Tamaño del archivo en bytes.',
      },
    },
    {
      name: 'mimeType',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.resourceType === 'file',
        description: 'MIME type del archivo (ej: text/csv, application/json).',
      },
    },
    {
      name: 'fileHash',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.resourceType === 'file',
        description: 'Hash del archivo (SHA-256) para verificación de integridad.',
      },
    },

    // --- Campo de enlace (condicional si resourceType === 'link') ---
    {
      name: 'externalUrl',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.resourceType === 'link',
        description: 'URL del recurso externo.',
      },
    },

    // --- Auditoría ---
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

    // --- Control de versión (R8) ---
    {
      // true si el dataset asociado fue aprobado (editorialStatus: approved) al menos una vez.
      // Se setea vía hook afterChange del Dataset cuando editorialStatus → approved.
      // Determina si el delete es hard o soft (beforeDelete).
      name: 'everPublished',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Indica si este resource alguna vez fue parte de una versión publicada.',
        condition: (_, siblingData) => Boolean(siblingData?.id),
      },
      access: {
        update: sysadminOnly,
      },
    },
    {
      // R8 — Si true, el resource no se incluye en la próxima versión publicada del dataset.
      // Se setea a true automáticamente en beforeDelete si everPublished === true.
      name: 'excludeFromNextVersion',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Si está marcado, este resource no se incluirá en la próxima versión del dataset.',
        condition: (_, siblingData) => Boolean(siblingData?.id),
      },
    },

    // --- Soft-delete ---
    {
      name: 'deletedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Soft-delete. Si tiene valor, el resource está eliminado.',
        condition: (_, siblingData) => Boolean(siblingData?.deletedAt),
      },
      access: {
        update: sysadminOnly,
      },
    },
  ],
  timestamps: true,
}
