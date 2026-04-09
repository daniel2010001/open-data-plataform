import { ValidationError, type CollectionConfig } from 'payload'

import {
  allow,
  allowIf,
  getOrgId,
  hasOrgRole,
  isAuthenticated,
  isSysadmin,
  sysadminFieldAccess,
} from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    // access.admin requiere retorno boolean estricto (no Where) — ver CollectionConfig types
    admin: (args) => isAuthenticated(args),
    // Sysadmin crea cualquier user; owner de una org puede crear users para SU org.
    // La restricción de "solo su org" se refuerza en el hook beforeChange.
    create: allow(allowIf(isSysadmin), allowIf(hasOrgRole(['owner']))),
    // Sysadmin ve todos; users autenticados ven solo los de su org (Where).
    // Users sin org solo se ven a sí mismos.
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin', 'member']), (args) => ({
        organization: { equals: getOrgId(args.req.user) },
      })),
      allowIf(isAuthenticated, (args) => ({ id: { equals: args.req.user.id } })),
    ),
    // Sysadmin puede todo; el user se edita a sí mismo; owner edita users de su org
    update: allow(
      allowIf(isSysadmin),
      allowIf(isAuthenticated, (args) => ({ id: { equals: args.req.user.id } })),
      allowIf(hasOrgRole(['owner']), (args) => ({
        organization: { equals: getOrgId(args.req.user) },
      })),
    ),
    delete: allowIf(isSysadmin),
  },
  admin: {
    defaultColumns: ['name', 'email', 'systemRole', 'orgRole', 'updatedAt'],
    useAsTitle: 'name',
  },
  auth: true,
  hooks: {
    beforeChange: [
      // Al crear un user, si el creador es owner de una org, auto-asignar esa org
      // al nuevo user si no se especificó una explícitamente.
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        const creator = req.user
        if (!creator || creator.systemRole === 'sysadmin') return data

        const creatorOrgId =
          typeof creator.organization === 'object' ? creator.organization?.id : creator.organization
        if (!creatorOrgId)
          throw new ValidationError({
            errors: [
              { message: 'No puedes crear un usuario sin organización', path: 'organization' },
            ],
          })

        const dataOrgId =
          typeof data.organization === 'object' ? data.organization?.id : data.organization

        if (!dataOrgId) data.organization = creatorOrgId

        if (!creatorOrgId || creatorOrgId !== dataOrgId)
          throw new ValidationError({
            errors: [
              {
                message: 'No puedes asignar una organización diferente a la tuya',
                path: 'organization',
              },
            ],
          })

        if (creatorOrgId && !data.organization) {
          data.organization = creatorOrgId
          if (!data.orgRole) data.orgRole = 'member'
        }

        return data
      },
    ],
  },
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
      // Solo sysadmin asigna org manualmente — los owners crean users que la heredan via hook
      access: { update: sysadminFieldAccess },
      admin: {
        // Oculto para no-sysadmins — se asigna automáticamente
        condition: (_, __, { user }) => user?.systemRole === 'sysadmin',
        description: 'Organización del usuario (se asigna automáticamente al crear)',
      },
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
      // Solo owner o sysadmin pueden cambiar el rol de un user de su org.
      // El owner NO puede editar su propio orgRole — se verifican ambas condiciones.
      // El valor 'owner' no debería asignarse manualmente — se gestiona via
      // Organization.owner y el hook afterChange de Organizations.
      access: {
        update: (args) => {
          const { user } = args.req
          if (!user) return false
          if (user.systemRole === 'sysadmin') return true
          // Bloquear self-edit: el owner no puede cambiar su propio orgRole
          if (args.doc?.id && String(args.doc.id) === String(user.id)) return false
          return user.orgRole === 'owner'
        },
      },
      admin: {
        description: 'Rol dentro de la organización. "Owner" se asigna al crear la org.',
      },
      filterOptions: ({ data, req: { user }, options }) => {
        if (user?.systemRole === 'sysadmin') return options
        if (data?.orgRole === 'owner') return [{ label: 'Owner', value: 'owner' }]
        return options.filter((option) =>
          typeof option !== 'string' ? option.value !== 'owner' : option !== 'owner',
        )
      },
    },

    // ---- Permisos granulares ----
    {
      name: 'canCreateDatasets',
      type: 'checkbox',
      defaultValue: false,
      saveToJWT: true,
      // Solo owner o sysadmin pueden conceder este permiso a un member.
      // El owner NO puede editarse este campo a sí mismo — misma lógica que orgRole.
      access: {
        update: (args) => {
          const { user } = args.req
          if (!user) return false
          if (user.systemRole === 'sysadmin') return true
          if (args.doc?.id && String(args.doc.id) === String(user.id)) return false
          return user.orgRole === 'owner'
        },
      },
      admin: {
        description: 'Permite que un member cree datasets en su organización',
        condition: (data) => data.orgRole === 'member',
      },
    },
  ],
  timestamps: true,
}
