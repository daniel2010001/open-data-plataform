import type { CollectionConfig } from 'payload'
import { slugField, ValidationError } from 'payload'

import { anyone } from '@/access/anyone'
import { asAdmin } from '@/access/asAdmin'
import { sysadminFieldAccess } from '@/access/fieldAccess'
import { orgOwner } from '@/access/orgOwner'
import { sysadmin } from '@/access/sysadmin'

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  access: {
    create: sysadmin,
    read: anyone,
    // Sysadmin puede todo; el owner del documento puede actualizar su propia org.
    // orgRole() no aplica acá — Organizations no tiene campo `organization`,
    // el ownership se determina por el campo `owner` del documento.
    update: asAdmin(orgOwner),
    delete: sysadmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'level', 'isActive', 'updatedAt'],
  },
  hooks: {
    beforeValidate: [
      // Validar que el parent tenga canHaveChildren === true antes de asignarlo.
      // Segunda capa de protección — la primera es el filterOptions en el campo.
      async ({ data, req }) => {
        if (!data?.parent) return data

        const parentId =
          typeof data.parent === 'object' ? (data.parent as { id: string }).id : data.parent

        try {
          const parent = await req.payload.findByID({
            collection: 'organizations',
            id: parentId,
            depth: 0,
            req,
          })

          if (!parent.canHaveChildren) {
            throw new ValidationError({
              errors: [
                {
                  message: 'La organización padre no acepta sub-organizaciones',
                  path: 'parent',
                },
              ],
            })
          }
        } catch (err) {
          if (err instanceof ValidationError) throw err
          // Si falla el lookup del parent, dejamos pasar — beforeChange calculará level=0
        }

        return data
      },
    ],
    beforeChange: [
      // Calcular level automáticamente según la jerarquía de parent.
      async ({ data, req }) => {
        if (!data.parent) {
          data.level = 0
        } else {
          try {
            const parentId =
              typeof data.parent === 'object' ? (data.parent as { id: string }).id : data.parent

            const parentOrg = await req.payload.findByID({
              collection: 'organizations',
              id: parentId,
              depth: 0,
              req,
            })
            data.level = (parentOrg.level ?? 0) + 1
          } catch {
            // Defensive: si falla el lookup, nivel 0
            data.level = 0
          }
        }

        return data
      },
    ],
    afterChange: [
      // Al crear una org con owner asignado, auto-asignar la org y el orgRole al user.
      // Esto elimina el paso manual de sysadmin: crear org → editar user → asignar org.
      async ({ doc, req, operation }) => {
        if (operation !== 'create' || !doc.owner) return

        const ownerId = typeof doc.owner === 'object' ? doc.owner.id : doc.owner

        await req.payload.update({
          collection: 'users',
          id: ownerId,
          data: {
            organization: doc.id,
            // El owner tiene orgRole 'admin' en el JWT — el ownership real está en
            // Organization.owner, no en el enum de orgRole (que solo tiene admin|member).
            orgRole: 'admin',
          },
          req, // misma transacción
        })
      },
    ],
  },
  fields: [
    // ---- Identidad ----
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({
      position: undefined,
    }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'URL del sitio web',
      },
    },
    {
      name: 'email',
      type: 'text',
      admin: {
        description: 'Correo de contacto',
      },
    },

    // ---- Jerarquía ----
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'organizations',
      index: true,
      // Solo sysadmin puede cambiar el parent — reorganizar el árbol es una operación
      // administrativa que afecta a toda la jerarquía.
      access: {
        update: sysadminFieldAccess,
      },
      // Filtrar solo orgs que pueden tener hijos — primera capa de protección en UI.
      // La segunda capa es el hook beforeValidate en el backend.
      filterOptions: () => ({
        canHaveChildren: { equals: true },
      }),
    },
    {
      name: 'level',
      type: 'number',
      min: 0,
      defaultValue: 0,
      index: true,
      admin: {
        readOnly: true,
        description: 'Calculado automáticamente según la jerarquía de parent',
      },
    },
    {
      name: 'canHaveChildren',
      type: 'checkbox',
      defaultValue: false,
      // Field access solo retorna boolean (no Where) — ver access-control.md
      access: {
        update: sysadminFieldAccess,
      },
    },

    // ---- Gobernanza ----
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      // Solo sysadmin puede cambiar el owner — transferir ownership es una operación
      // administrativa global, no de la org misma.
      access: {
        update: sysadminFieldAccess,
      },
      // Filtrar solo users sin org asignada — un user no puede ser owner de dos orgs.
      filterOptions: () => ({
        organization: { exists: false },
      }),
    },

    // ---- Estado ----
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      // Solo sysadmin activa/desactiva orgs — es una decisión del sistema, no de la org.
      access: {
        update: sysadminFieldAccess,
      },
    },
  ],
  timestamps: true,
}
