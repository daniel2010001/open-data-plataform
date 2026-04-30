import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

import { allow, allowIf, isSysadmin } from '@/access'
import { hasOrgRole } from '@/access/guards'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'
import { teamsBeforeChange } from './hooks/beforeChange'

export const Teams: CollectionConfig = {
  slug: 'teams',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // R1 — owner/admin de la org, o sysadmin (R10)
    create: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin'])),
    ),

    // Owner/admin ven los teams de su org. Sysadmin ve todos.
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin']), (args): Where => ({
        organization: { equals: args.req.user.organization },
      })),
    ),

    // R1 — mismas condiciones que create
    update: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin']), (args): Where => ({
        organization: { equals: args.req.user.organization },
      })),
    ),

    // R9 — eliminar team no afecta expansiones previas. Owner/admin o sysadmin.
    delete: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin']), (args): Where => ({
        organization: { equals: args.req.user.organization },
      })),
    ),
  },
  hooks: {
    beforeChange: [assignCreatedBy, teamsBeforeChange],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    // Slug generado desde 'name'. Unique enforced a nivel de org en beforeChange si es necesario.
    slugField({ useAsSlug: 'name' }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
    },
    {
      // M:N via tabla pivot team_members generada por Payload
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description: 'Usuarios del team. Solo pueden ser de la misma org (R2).',
      },
    },
    {
      // R8 — false bloquea nuevas asignaciones, no revoca permisos ya expandidos
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Desactivar bloquea nuevas asignaciones. No revoca permisos expandidos. (R8)',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        condition: (_, siblingData) => Boolean(siblingData?.createdBy),
      },
    },
  ],
  timestamps: true,
}
