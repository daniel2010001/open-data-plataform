import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { allowIf, anyone, isAuthenticated } from '@/access'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    create: allowIf(isAuthenticated),
    read: anyone,
    update: allowIf(isAuthenticated),
    delete: allowIf(isAuthenticated),
  },
  timestamps: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({ useAsSlug: 'name' }),
  ],
}
