import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { authenticated } from '@/access/authenticated'
import { or } from '@/access/or'
import { sysadmin } from '@/access/sysadmin'

// NOTA: La variable se llama DataCollections (no Collections) porque
// `collections` es una palabra reservada en Payload/JS. El slug es 'data-collections'.

export const DataCollections: CollectionConfig = {
  slug: 'data-collections',
  access: {
    // TODO (V1): org-scope no aplica en V0 — DataCollections son transversales a orgs.
    // Si en el futuro se agrega un campo `organization`, aplicar isSysadminOrOrgRole aquí.
    create: authenticated,
    // Usuarios autenticados ven todo; anónimos solo ven las colecciones públicas
    read: or(authenticated, () => ({ isPublic: { equals: true } })),
    update: authenticated,
    delete: sysadmin,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isPublic', 'updatedAt'],
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Setear createdBy automáticamente al crear si no está definido
        if (operation === 'create' && !data.createdBy) {
          data.createdBy = req.user?.id
        }
        return data
      },
    ],
  },
  fields: [
    // ---- Identidad ----
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    // Slug auto-generado desde el campo `title`
    slugField({ useAsSlug: 'title' }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },

    // ---- Datasets ----
    {
      name: 'datasets',
      type: 'relationship',
      relationTo: 'datasets',
      hasMany: true,
      admin: {
        description:
          'Datasets incluidos en esta colección. Un dataset puede pertenecer a múltiples colecciones.',
      },
    },

    // ---- Visibilidad ----
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Si está desmarcado, la colección solo es visible para usuarios autenticados',
      },
    },

    // ---- Autoría ----
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        description: 'Usuario que creó la colección',
      },
    },
  ],
  timestamps: true,
}
