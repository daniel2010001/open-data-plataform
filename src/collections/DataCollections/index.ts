import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

import { allow, allowIf, isSysadmin, isAuthenticated } from '@/access'
import { hasOrgRole } from '@/access/guards'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'
import { dataCollectionsBeforeChange } from './hooks/beforeChange'

export const DataCollections: CollectionConfig = {
  slug: 'data-collections',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // R1 — owner/admin de la org o sysadmin (R10)
    create: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin'])),
    ),

    // R5 — isPublished: true → cualquiera (incluso anónimo)
    // R6 — isPublished: false → solo owner/admin de la org y sysadmin
    read: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin']), (args): Where => ({
        organization: { equals: args.req.user.organization },
      })),
      // Cualquier usuario autenticado o anónimo puede leer las publicadas
      allowIf(isAuthenticated, (): Where => ({
        isPublished: { equals: true },
      })),
      // Acceso anónimo — Payload evalúa access con user null para requests sin auth
      // El `allow` incluye un fallback público para isPublished: true
    ),

    // R1 — mismas condiciones que create
    update: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin']), (args): Where => ({
        organization: { equals: args.req.user.organization },
      })),
    ),

    // R8 — eliminar no afecta datasets. Owner/admin o sysadmin.
    delete: allow(
      allowIf(isSysadmin),
      allowIf(hasOrgRole(['owner', 'admin']), (args): Where => ({
        organization: { equals: args.req.user.organization },
      })),
    ),
  },
  hooks: {
    beforeChange: [assignCreatedBy, dataCollectionsBeforeChange],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({ useAsSlug: 'name' }),
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
    },
    {
      // M:N via tabla pivot data_collection_datasets generada por Payload
      // R3 — cualquier dataset de la org, sin importar estado o visibilidad
      // R7 — al leer, cada dataset aplica sus propias reglas de acceso (omisión silenciosa)
      name: 'datasets',
      type: 'relationship',
      relationTo: 'datasets',
      hasMany: true,
      admin: {
        description: 'Datasets incluidos en esta colección. Solo de la misma org (R2). R7: cada dataset aplica sus propias reglas al leer.',
      },
    },
    {
      // R5/R6 — true: visible públicamente. false: solo owner/admin/sysadmin.
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Publicar hace la colección visible para cualquier usuario (R5).',
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
