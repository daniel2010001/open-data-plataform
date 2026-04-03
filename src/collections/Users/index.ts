import type { CollectionConfig } from 'payload'

import { asAdmin } from '@/access/asAdmin'
import { authenticated } from '@/access/authenticated'
import { sysadminFieldAccess } from '@/access/fieldAccess'
import { self } from '@/access/self'
import { sysadmin } from '@/access/sysadmin'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    // access.admin requiere retorno boolean estricto (no Where) — ver CollectionConfig types
    admin: ({ req: { user } }) => Boolean(user),
    create: sysadmin,
    read: authenticated,
    update: asAdmin(self),
    delete: sysadmin,
  },
  admin: {
    defaultColumns: ['name', 'email', 'systemRole', 'updatedAt'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },

    // ---- Roles y permisos ----
    {
      name: 'systemRole',
      type: 'select',
      options: [
        { label: 'Sysadmin', value: 'sysadmin' },
        { label: 'User', value: 'user' },
      ],
      defaultValue: 'user',
      required: true,
      saveToJWT: true,
      access: { read: sysadminFieldAccess, update: sysadminFieldAccess },
    },

    // ---- Organización ----
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      index: true,
      access: { update: sysadminFieldAccess },
    },
    {
      name: 'orgRole',
      type: 'select',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Admin', value: 'admin' },
        { label: 'Member', value: 'member' },
      ],
      saveToJWT: true,
      access: { update: sysadminFieldAccess },
    },

    // ---- Permisos granulares ----
    {
      name: 'canCreateDatasets',
      type: 'checkbox',
      defaultValue: false,
      saveToJWT: true,
      access: { update: sysadminFieldAccess },
      admin: {
        description: 'Permite que un member cree datasets en su organización',
        condition: (data) => data.orgRole === 'member',
      },
    },
  ],
  timestamps: true,
}
