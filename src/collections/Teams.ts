import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { asAdmin } from '@/access/asAdmin'
import { authenticated } from '@/access/authenticated'
import { orgRole } from '@/access/orgRole'
import { sysadmin } from '@/access/sysadmin'

export const Teams: CollectionConfig = {
  slug: 'teams',
  access: {
    // Solo owner/admin de la org pueden crear o modificar teams de su org
    create: asAdmin(orgRole(['owner', 'admin'])),
    // Teams no son públicos — solo usuarios autenticados pueden leer
    read: authenticated,
    update: asAdmin(orgRole(['owner', 'admin'])),
    delete: sysadmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'organization', 'isActive', 'updatedAt'],
  },
  fields: [
    // ---- Identidad ----
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    // Slug auto-generado desde el campo `name`
    slugField({ useAsSlug: 'name' }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },

    // ---- Organización ----
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
      admin: {
        description: 'Organización a la que pertenece este team',
      },
    },

    // ---- Miembros ----
    {
      name: 'members',
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
          defaultValue: 'member',
          options: [
            { label: 'Admin del team', value: 'admin' },
            { label: 'Miembro', value: 'member' },
          ],
        },
      ],
    },

    // ---- Estado ----
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
  ],
  timestamps: true,
}
