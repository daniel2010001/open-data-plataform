// API: operaciones sobre recursos (archivos/enlaces dentro de datasets)

import type { CkanClient } from './client';
import type { CkanResource } from '$lib/types/ckan';

export function createResourceApi(client: CkanClient) {
	return {
		/** Obtener detalle de un recurso */
		async show(id: string): Promise<CkanResource> {
			return client.post<CkanResource>('resource_show', { id });
		},

		/** Crear un recurso en un dataset existente */
		async create(data: {
			package_id: string;
			name: string;
			description?: string;
			url: string;
			format?: string;
			resource_type?: string;
		}): Promise<CkanResource> {
			return client.post<CkanResource>('resource_create', data as unknown as Record<string, unknown>);
		},

		/** Actualizar un recurso */
		async update(data: Record<string, unknown>): Promise<CkanResource> {
			return client.post<CkanResource>('resource_update', data);
		},

		/** Eliminar un recurso */
		async delete(id: string): Promise<void> {
			await client.post<void>('resource_delete', { id });
		},
	};
}

export type ResourceApi = ReturnType<typeof createResourceApi>;
