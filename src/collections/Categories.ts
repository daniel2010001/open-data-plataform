import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { anyone } from '@/access/anyone'
import { authenticated } from '@/access/authenticated'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: authenticated,
    read: anyone,
    update: authenticated,
    delete: authenticated,
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
