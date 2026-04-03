import type { CollectionConfig } from 'payload'

import { asAdmin } from '@/access/asAdmin'
import { collaborator } from '@/access/collaborator'
import { or } from '@/access/or'
import { orgRole } from '@/access/orgRole'
import { sysadmin } from '@/access/sysadmin'
import type { Dataset, Organization } from '@/payload-types'

export const Resources: CollectionConfig = {
  slug: 'resources',
  access: {
    // Mismo scope que Datasets: org members ven todo; colaboradores ven los suyos; anónimos solo activos
    read: or(
      asAdmin(orgRole(['owner', 'admin', 'member'])),
      collaborator(['editor', 'viewer']),
      () => ({ status: { equals: 'active' } }),
    ),
    // Solo owner/admin de la org (se verifica vía organization desnormalizado)
    create: asAdmin(orgRole(['owner', 'admin'])),
    // owner/admin siempre; colaborador editor del dataset padre
    update: or(asAdmin(orgRole(['owner', 'admin'])), collaborator('editor')),
    delete: sysadmin,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'dataset', 'fileFormat', 'status', 'updatedAt'],
  },
  hooks: {
    beforeChange: [
      // Desnormaliza organization desde el dataset padre.
      // Permite que el access control use orgRole() sin un async lookup en cada request.
      async ({ data, req, operation }) => {
        const datasetId = operation === 'create' ? data.dataset : (data.dataset ?? undefined)

        if (!datasetId) return data

        const dataset = await req.payload.findByID({
          collection: 'datasets',
          id: typeof datasetId === 'object' ? datasetId.id : datasetId,
          depth: 0,
          req, // misma transacción
        })

        const orgId =
          dataset.organization && typeof dataset.organization === 'object'
            ? (dataset.organization as Organization).id
            : (dataset.organization as number)

        data.organization = orgId

        return data
      },
    ],
  },
  // TODO (V1): agregar hook beforeChange para leer filesize/filename/mimeType
  // del documento `media` relacionado y persistirlos en este documento.
  // En V0 esos campos se llenan manualmente desde el admin.
  fields: [
    // ---- Identidad ----
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },

    // ---- Dataset padre ----
    {
      name: 'dataset',
      type: 'relationship',
      relationTo: 'datasets',
      required: true,
      index: true,
    },

    // ---- Organización (desnormalizado del dataset padre) ----
    // Se llena automáticamente via hook beforeChange — no editar manualmente.
    // Permite que orgRole() funcione en el access control sin async lookups.
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: false, // El hook lo setea; no se exige en el form
      index: true,
      admin: {
        readOnly: true,
        description: 'Se copia automáticamente del dataset padre',
        position: 'sidebar',
      },
    },

    // ---- Archivo ----
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'fileFormat',
      type: 'select',
      admin: {
        description: 'Se detecta automáticamente del archivo subido',
      },
      options: [
        { label: 'PDF', value: 'pdf' },
        { label: 'CSV', value: 'csv' },
        { label: 'Excel (XLSX)', value: 'xlsx' },
        { label: 'Imagen (JPG/PNG)', value: 'image' },
        { label: 'Otro', value: 'other' },
      ],
    },
    {
      name: 'fileSize',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Tamaño en bytes (automático)',
      },
    },
    {
      name: 'originalFilename',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'mimeType',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },

    // ---- Estado del resource ----
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Activo', value: 'active' },
        { label: 'Discontinuado', value: 'deprecated' },
        { label: 'Oculto', value: 'hidden' },
      ],
    },
    {
      name: 'deprecatedReason',
      type: 'text',
      admin: {
        condition: (data) => data.status === 'deprecated',
        description: 'Motivo por el que este resource fue discontinuado',
      },
    },

    // ---- Orden ----
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Orden de aparición dentro del dataset (menor = primero)',
      },
    },
  ],
  timestamps: true,
}
