// API: operaciones sobre organizaciones

import type { CkanClient } from './client';
import type { CkanOrganization } from '$lib/types/ckan';

export function createOrganizationApi(client: CkanClient) {
	return {
		/** Listar todas las organizaciones */
		async list(): Promise<CkanOrganization[]> {
			return client.post<CkanOrganization[]>('organization_list', {
				all_fields: true,
				include_extras: true,
			});
		},

		/** Obtener detalle de una organización por ID o slug */
		async show(id: string): Promise<CkanOrganization> {
			return client.post<CkanOrganization>('organization_show', {
				id,
				include_datasets: true,
				include_extras: true,
			});
		},

		/** Crear una organización (requiere permisos de admin) */
		async create(data: Record<string, unknown>): Promise<CkanOrganization> {
			return client.post<CkanOrganization>('organization_create', data);
		},

		/** Actualizar una organización */
		async update(data: Record<string, unknown>): Promise<CkanOrganization> {
			return client.post<CkanOrganization>('organization_update', data);
		},

		/** Organizaciones donde el usuario actual tiene rol */
		async listForUser(permission?: 'create_dataset' | 'admin' | 'editor' | 'member'): Promise<
			CkanOrganization[]
		> {
			return client.post<CkanOrganization[]>('organization_list_for_user', {
				permission,
			});
		},
	};
}

export type OrganizationApi = ReturnType<typeof createOrganizationApi>;
