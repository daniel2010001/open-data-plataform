import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { anyone } from '@/access/anyone'
import { sysadmin } from '@/access/sysadmin'
import { asAdmin } from '@/access/asAdmin'
import { orgOwner } from '@/access/orgOwner'
import { sysadminFieldAccess } from '@/access/fieldAccess'

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  access: {
    create: sysadmin,
    read: anyone,
    // Sysadmin puede todo; owner u org-admin pueden actualizar su propia org
    update: asAdmin(orgOwner),
    delete: sysadmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'level', 'isActive', 'updatedAt'],
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (!data.parent) {
          data.level = 0
        } else {
          try {
            const parentOrg = await req.payload.findByID({
              collection: 'organizations',
              id: data.parent,
              depth: 0,
              req,
            })
            data.level = (parentOrg.level ?? 0) + 1
          } catch {
            // Defensive: si falla el lookup, nivel 0
            data.level = 0
          }
        }

        return data
      },
    ],
  },
  fields: [
    // ---- Identidad ----
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({
      position: undefined,
    }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'URL del sitio web',
      },
    },
    {
      name: 'email',
      type: 'text',
      admin: {
        description: 'Correo de contacto',
      },
    },

    // ---- Jerarquía ----
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'organizations',
      index: true,
    },
    {
      name: 'level',
      type: 'number',
      min: 0,
      defaultValue: 0,
      index: true,
      admin: {
        readOnly: true,
        description: 'Calculado automáticamente según la jerarquía de parent',
      },
    },
    {
      name: 'canHaveChildren',
      type: 'checkbox',
      defaultValue: false,
      // Field access solo retorna boolean (no Where) — ver access-control.md
      access: {
        update: sysadminFieldAccess,
      },
    },

    // ---- Gobernanza ----
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      index: true,
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
