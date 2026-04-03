import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { asAdmin } from '@/access/asAdmin'
import { collaborator } from '@/access/collaborator'
import { or } from '@/access/or'
import { orgRole } from '@/access/orgRole'
import { sysadmin } from '@/access/sysadmin'
import { validateStatusTransition } from '@/hooks/validateStatusTransition'
import type { User } from '@/payload-types'

export const Datasets: CollectionConfig = {
  slug: 'datasets',
  access: {
    // owner/admin de la org ven todo; colaboradores ven los suyos; anónimos solo publicados
    read: or(
      asAdmin(orgRole(['owner', 'admin', 'member'])),
      collaborator(['editor', 'viewer']),
      () => ({ status: { equals: 'published' } }),
    ),
    // Solo owner/admin de la org pueden crear datasets; o un member con canCreateDatasets
    create: or(asAdmin(orgRole(['owner', 'admin'])), ({ req: { user } }) => {
      const u = user as User | null
      return Boolean(u?.orgRole === 'member' && u?.canCreateDatasets)
    }),
    // owner/admin siempre; member si es colaborador editor en este dataset
    update: or(asAdmin(orgRole(['owner', 'admin'])), collaborator('editor')),
    delete: sysadmin,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'organization', 'status', 'updatedAt'],
  },
  hooks: {
    beforeChange: [
      validateStatusTransition,
      async ({ data, originalDoc }) => {
        // Setear publishedAt automáticamente la primera vez que se publica
        if (data.status === 'published' && originalDoc?.status !== 'published') {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
  versions: {
    drafts: {
      autosave: false,
    },
    maxPerDoc: 50,
  },
  fields: [
    // ---- Identidad ----
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      position: undefined,
    }),
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Descripción corta para cards y listados',
      },
    },
    {
      name: 'description',
      type: 'richText',
      editor: lexicalEditor(),
    },

    // ---- Propiedad ----
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },

    // ---- Taxonomía ----
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },

    // ---- Licencia ----
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
        description: 'Especificá la licencia si elegiste "Otro"',
        condition: (data) => data.license === 'other',
      },
    },

    // ---- Cobertura ----
    {
      name: 'language',
      type: 'select',
      defaultValue: 'es',
      options: [
        { label: 'Español', value: 'es' },
        { label: 'English', value: 'en' },
        { label: 'Otro', value: 'other' },
      ],
    },
    {
      name: 'spatialCoverage',
      type: 'text',
      admin: {
        description: 'Cobertura geográfica (ej: Cochabamba, Bolivia)',
      },
    },
    {
      name: 'temporalCoverageStart',
      type: 'date',
    },
    {
      name: 'temporalCoverageEnd',
      type: 'date',
    },
    {
      name: 'updateFrequency',
      type: 'select',
      options: [
        { label: 'Diario', value: 'daily' },
        { label: 'Semanal', value: 'weekly' },
        { label: 'Mensual', value: 'monthly' },
        { label: 'Trimestral', value: 'quarterly' },
        { label: 'Anual', value: 'yearly' },
        { label: 'Irregular', value: 'irregular' },
        { label: 'Desconocido', value: 'unknown' },
      ],
    },

    // ---- Colaboradores externos ----
    {
      name: 'collaborators',
      type: 'array',
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
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
      ],
    },

    // ---- Publicación ----
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Borrador', value: 'draft' },
        { label: 'En revisión', value: 'in_review' },
        { label: 'Publicado', value: 'published' },
        { label: 'Archivado', value: 'archived' },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Se setea automáticamente al publicar',
      },
    },
    {
      name: 'versionLabel',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Versión actual (v1, v2, @.)',
      },
    },
  ],
  timestamps: true,
}
