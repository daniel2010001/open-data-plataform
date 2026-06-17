// API: operaciones sobre datasets (packages en CKAN)

import type { CkanClient } from './client';
import type {
	CkanPackage,
	CkanPagination,
} from '$lib/types/ckan';
import type { SearchParams, SearchResponse } from '$lib/types/api';

export function createDatasetApi(client: CkanClient) {
	return {
		/** Listar datasets públicos con búsqueda y facetas */
		async search(params: SearchParams = {}): Promise<SearchResponse<CkanPackage>> {
			const result = await client.post<CkanPagination>('package_search', {
				q: params.q ?? '*:*',
				fq: params.fq,
				rows: params.limit ?? 20,
				start: params.offset ?? 0,
				sort: params.sort ?? 'metadata_modified desc',
				// CKAN usa notación con punto para params de Solr
				'facet.field': params.facet_field ?? [
					'organization',
					'tags',
					'res_format',
					'license_id',
				],
				'facet.limit': params.facet_limit ?? 50,
				'facet.mincount': params.facet_min_count ?? 1,
			});

			return {
				count: result.count,
				results: result.results,
				sort: result.sort,
				search_facets: result.search_facets,
			};
		},

		/** Obtener detalle de un dataset por ID o slug */
		async show(id: string): Promise<CkanPackage> {
			return client.post<CkanPackage>('package_show', { id });
		},

		/** Crear un nuevo dataset */
		async create(data: Record<string, unknown>): Promise<CkanPackage> {
			return client.post<CkanPackage>('package_create', data);
		},

		/** Actualizar un dataset existente */
		async update(data: Record<string, unknown>): Promise<CkanPackage> {
			return client.post<CkanPackage>('package_update', data);
		},

		/** Eliminar (soft-delete) un dataset */
		async delete(id: string): Promise<void> {
			await client.post<void>('package_delete', { id });
		},

		/** Listar datasets de una organización */
		async byOrganization(
			orgId: string,
			params: SearchParams = {}
		): Promise<SearchResponse<CkanPackage>> {
			const fq = `organization:${orgId}`;
			const mergedParams = { ...params, fq: params.fq ? `${params.fq} AND ${fq}` : fq };
			return this.search(mergedParams);
		},

		/** Datasets actuales del usuario (requiere auth) */
		async currentUser(): Promise<CkanPackage[]> {
			return client.post<CkanPackage[]>('current_package_list_with_resources');
		},

		/** Activar/desactivar un dataset */
		async setState(id: string, state: 'active' | 'deleted' | 'draft'): Promise<CkanPackage> {
			return client.post<CkanPackage>('package_patch', { id, state });
		},
	};
}

export type DatasetApi = ReturnType<typeof createDatasetApi>;
