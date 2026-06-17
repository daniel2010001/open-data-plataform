// Tipos para la capa de comunicación con la API de CKAN

export interface ApiClientConfig {
	/** URL base del CKAN (ej: https://data.miuniversidad.edu.bo) */
	baseUrl: string;
	/** API Key opcional para acciones autenticadas */
	apiKey?: string;
	/** Timeout por defecto en ms */
	timeout?: number;
}

export interface PaginationParams {
	limit?: number;
	offset?: number;
}

export interface SearchParams extends PaginationParams {
	q?: string;
	fq?: string; // filter query (facetado)
	sort?: string;
	facet_field?: string[];
	facet_limit?: number;
	facet_min_count?: number;
}

export interface SearchResponse<T = unknown> {
	count: number;
	results: T[];
	sort: string;
	search_facets: Record<string, FacetDistribution>;
}

export interface FacetDistribution {
	title: string;
	items: FacetItem[];
}

export interface FacetItem {
	name: string;
	display_name: string;
	count: number;
}

// ─── API Error ───────────────────────────────────────────────────────
export class CkanApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public ckanType?: string
	) {
		super(message);
		this.name = 'CkanApiError';
	}
}

// ─── Auth ────────────────────────────────────────────────────────────
export interface AuthSession {
	token: string;
	user: CkanUser;
}

// Re-export para conveniencia
import type { CkanUser } from './ckan';
