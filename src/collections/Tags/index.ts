import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { allow, allowIf, anyone, isAuthenticated, isSysadmin, sysadminOnly } from '@/access'
import { assignCreatedBy } from '../_hooks/assignCreatedBy'
import { tagsBeforeValidate } from './hooks/beforeValidate'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // R2 — steward/editor crean tags inline al asignar a un dataset.
    // Por ahora: cualquier usuario autenticado puede crear.
    // Ajuste fino en Bloque 3 cuando existan los roles de dataset.
    create: allowIf(isAuthenticated),

    // R1 — Cualquiera (incluso anónimo) puede leer tags
    read: anyone,

    // Solo sysadmin puede editar tags directamente
    update: allowIf(isSysadmin),

    // R5/R6 — Sysadmin elimina manualmente; el sistema vía garbage collection usa overrideAccess
    delete: allowIf(isSysadmin),
  },
  hooks: {
    beforeValidate: [tagsBeforeValidate],
    beforeChange: [assignCreatedBy],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true, // R4 — Único global (normalizado). La constraint DB es el backstop.
      // La normalización y dedup explícito se hace en beforeValidate hook.
    },
    // slug: generado desde 'name' via Payload nativo. Único global.
    slugField({ useAsSlug: 'name' }),
    {
      name: 'usageCount',
      type: 'number',
      defaultValue: 0,
      // Mantenido por hooks de Datasets (Bloque 3). readOnly para usuarios.
      admin: {
        readOnly: true,
        description: 'Calculado automáticamente. No editar manualmente.',
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
      access: {
        read: sysadminOnly,
        update: sysadminOnly,
      },
    },
  ],
  timestamps: true,
}
