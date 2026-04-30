import type { CollectionConfig } from 'payload'

import { allowIf, allow, isSysadmin, isAuthenticated, hasOrgRole, getOrgId } from '@/access'
import { sysadminOnly, selfOrSysadmin } from '@/access'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'
import { autoAssignMembership } from './hooks/afterCreate'
import { preventLastSysadminDeactivation } from './hooks/beforeChange'
import { orgEnrichmentStrategy } from './strategies/orgEnrichment'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    strategies: [
      {
        name: 'org-enrichment',
        authenticate: orgEnrichmentStrategy,
      },
    ],
  },
  access: {
    // R1 — Solo sysadmin u owner pueden crear users
    create: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner'])),
    ),

    // R3 — Autenticados ven users de su org; sysadmin ve todos; sin org: solo self
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin', 'member']), (args) => ({
        'orgMemberships.organization': { equals: getOrgId(args.req.user) },
      })),
      // User autenticado sin org — solo se ve a sí mismo
      allowIf(isAuthenticated, (args) => ({
        id: { equals: args.req.user.id },
      })),
    ),

    // R5 — Sysadmin, owner de la misma org, o self pueden actualizar
    update: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner']), (args) => ({
        'orgMemberships.organization': { equals: getOrgId(args.req.user) },
      })),
      allowIf(isAuthenticated, (args) => ({
        id: { equals: args.req.user.id },
      })),
    ),

    // R6 — Solo sysadmin puede eliminar (purge físico)
    delete: allowIf(isSysadmin),
  },
  hooks: {
    // R2 — Si owner crea un user, auto-asignar OrgMembership con orgRole: member
    afterChange: [autoAssignMembership],
    beforeChange: [
      // Autoasignar createdBy en create
      assignCreatedBy,
      // R10 — Bloquear desactivación del último sysadmin activo
      preventLastSysadminDeactivation,
    ],
  },
  fields: [
    // email es manejado por Payload auth — no se redeclara
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'systemRole',
      type: 'select',
      options: [
        { label: 'Sysadmin', value: 'sysadmin' },
        { label: 'User', value: 'user' },
      ],
      defaultValue: 'user',
      required: true,
      // R7 — Solo sysadmin puede leer y modificar systemRole
      access: {
        read: sysadminOnly,
        update: sysadminOnly,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      required: true,
      // R8 — Solo sysadmin puede cambiar isActive
      access: {
        read: selfOrSysadmin,
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
