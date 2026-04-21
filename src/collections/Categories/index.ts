import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { allow, allowIf, isSysadmin, sysadminOnly } from '@/access'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // R1 — Solo sysadmin puede crear categorías
    create: allowIf(isSysadmin),

    // R2 — Público: solo activas. Sysadmin: todas
    read: allow(
      allowIf(isSysadmin),
      () => ({ isActive: { equals: true } }),
    ),

    // R1 — Solo sysadmin puede editar
    update: allowIf(isSysadmin),

    // R1 — Solo sysadmin puede eliminar (guards R6/R7 en beforeDelete hook)
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
      // Unicidad por parent se valida en beforeChange hook (no hay unique compuesto nativo)
    },
    // slug: generado desde 'name' via Payload nativo. Unique global.
    slugField({ useAsSlug: 'name' }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories' as 'users', // temp: 'categories' no está en CollectionSlug hasta generate:types
      hasMany: false,
    },
    {
      name: 'level',
      type: 'number',
      defaultValue: 0,
      // R8 — Calculado por hook, nunca editable directamente
      admin: {
        readOnly: true,
        condition: (_, siblingData) => siblingData?.level !== undefined,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
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
