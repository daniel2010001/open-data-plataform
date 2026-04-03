import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    create: authenticated,
    read: anyone,
    update: authenticated,
    delete: authenticated,
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
