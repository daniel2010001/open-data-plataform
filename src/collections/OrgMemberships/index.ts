import type { CollectionConfig } from 'payload'

import { allowIf, allow, isSysadmin, hasOrgRole, getOrgId } from '@/access'
import { enforceUniqueUserMembership, enforceOwnerConstraints } from './hooks/beforeChange'

export const OrgMemberships: CollectionConfig = {
  slug: 'org-memberships',
  admin: {
    useAsTitle: 'orgRole',
  },
  access: {
    // R3 — Sysadmin puede crear membresías con cualquier rol
    // R4 — Owner puede crear membresías en su propia org
    create: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner'])),
    ),

    // R9 — Sysadmin ve todo; owner/admin/member ven su org
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin', 'member']), (args) => ({
        organization: { equals: getOrgId(args.req.user) },
      })),
    ),

    // R3/R5 — Sysadmin puede cambiar cualquier rol; owner puede cambiar admin↔member en su org
    update: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner']), (args) => ({
        organization: { equals: getOrgId(args.req.user) },
      })),
    ),

    // R3 — Sysadmin puede eliminar; owner puede eliminar membresías de su org (no la propia)
    delete: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner']), (args) => ({
        organization: { equals: getOrgId(args.req.user) },
      })),
    ),
  },
  hooks: {
    beforeChange: [
      // R1 — UNIQUE(user_id): un user solo puede tener una membresía activa
      enforceUniqueUserMembership,
      // R2/R5 — Un solo owner por org; owner no puede asignar orgRole: owner
      enforceOwnerConstraints,
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
    },
    {
      name: 'orgRole',
      type: 'select',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Admin', value: 'admin' },
        { label: 'Member', value: 'member' },
      ],
      required: true,
    },
    {
      name: 'joinedAt',
      type: 'date',
      admin: {
        readOnly: true,
        condition: (_, siblingData) => Boolean(siblingData?.id),
      },
      hooks: {
        beforeValidate: [
          ({ value, operation }) => {
            if (operation === 'create' && !value) return new Date().toISOString()
            return value
          },
        ],
      },
    },
  ],
}
