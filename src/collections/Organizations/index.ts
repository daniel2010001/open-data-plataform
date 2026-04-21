import type { CollectionConfig } from 'payload'

import { allowIf, allow, isSysadmin, hasOrgRole, getOrgId } from '@/access'
import { sysadminOnly, ownerOrSysadmin } from '@/access'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // R1 — Solo sysadmin puede crear orgs
    create: allowIf(isSysadmin),

    // R2 — Cualquiera puede leer orgs activas; sysadmin ve todo (incluyendo inactivas)
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin', 'member']), (args) => ({
        isActive: { equals: true },
        id: { equals: getOrgId(args.req.user) },
      })),
      // Público (anónimo): solo orgs activas
      () => ({ isActive: { equals: true } }),
    ),

    // R3 — Sysadmin o owner pueden editar su org
    update: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner']), (args) => ({
        id: { equals: getOrgId(args.req.user) },
      })),
    ),

    // R4 — Solo sysadmin puede eliminar orgs
    delete: allowIf(isSysadmin),
  },
  hooks: {
    beforeChange: [assignCreatedBy],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeValidate: [
          ({ value, data, operation }) => {
            if (operation === 'create' || !value) {
              const source = data?.name as string | undefined
              if (!source) return value
              return source
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
            }
            return value
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      // R8 — Solo sysadmin puede cambiar isActive
      access: {
        read: ownerOrSysadmin,
        update: sysadminOnly,
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      // Autoasignado por hook — nunca editable por el usuario
      admin: {
        readOnly: true,
        condition: (_, siblingData) => Boolean(siblingData?.createdBy),
      },
      access: {
        read: sysadminOnly,
        update: sysadminOnly,
      },
    },
  ],
  timestamps: true,
}
