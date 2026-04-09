import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { allow, allowIf, anyone, isAuthenticated } from '@/access'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: allowIf(isAuthenticated),
    read: anyone,
    update: allowIf(isAuthenticated),
    delete: allowIf(isAuthenticated),
  },
  admin: {
    useAsTitle: 'title',
  },
  timestamps: true,
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'icon',
      type: 'text',
      admin: {
        description: 'Nombre de ícono o emoji representativo',
      },
    },
    slugField({
      position: undefined,
    }),
  ],
}
