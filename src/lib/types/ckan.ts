// Tipos base que reflejan los objetos de la API REST de CKAN
// Documentación: https://docs.ckan.org/en/latest/api/index.html

// ─── Response Envelope ───────────────────────────────────────────────
export interface CkanApiResponse<T> {
	help: string;
	success: boolean;
	result: T;
	error?: CkanApiError;
}

export interface CkanApiError {
	message: string;
	__type: string;
}

// ─── Pagination ──────────────────────────────────────────────────────
export interface CkanPagination {
	count: number;
	sort: string;
	facets: Record<string, Record<string, number>>;
	results: CkanPackage[];
	search_facets: Record<string, CkanFacet>;
}

export interface CkanFacet {
	title: string;
	items: CkanFacetItem[];
}

export interface CkanFacetItem {
	name: string;
	display_name: string;
	count: number;
}

// ─── Organization ────────────────────────────────────────────────────
export interface CkanOrganization {
	id: string;
	name: string; // slug
	title: string;
	description: string;
	image_url?: string;
	created: string;
	state: 'active' | 'deleted';
	package_count?: number;
	users?: CkanUser[];
	// extras puede contener metadata adicional
	extras?: CkanExtra[];
}

// ─── User ────────────────────────────────────────────────────────────
export interface CkanUser {
	id: string;
	name: string;
	display_name: string;
	email?: string;
	created: string;
	state: 'active' | 'deleted';
	role?: string;
	capacity?: string;
}

// ─── Resource ────────────────────────────────────────────────────────
export interface CkanResource {
	id: string;
	package_id: string;
	name: string;
	description?: string;
	format?: string; // CSV, PDF, JSON, etc.
	url: string;
	resource_type?: string; // file, api, etc.
	mimetype?: string;
	size?: number;
	created: string;
	last_modified: string;
	state: 'active' | 'deleted';
	position: number;
	hash?: string;
	// extras para metadatos adicionales
	extras?: CkanExtra[];
}

// ─── Tag ─────────────────────────────────────────────────────────────
export interface CkanTag {
	id: string;
	name: string;
	display_name: string;
	vocabulary_id?: string;
	state: 'active' | 'deleted';
}

// ─── Extra / Key-Value ───────────────────────────────────────────────
export interface CkanExtra {
	key: string;
	value: string;
	__extras?: Record<string, unknown>;
}

// ─── Group / Collection ──────────────────────────────────────────────
export interface CkanGroup {
	id: string;
	name: string;
	title: string;
	description?: string;
	image_url?: string;
	created: string;
	state: 'active' | 'deleted';
	package_count?: number;
}

// ─── Package (Dataset) ───────────────────────────────────────────────
export interface CkanPackage {
	id: string;
	name: string; // slug único
	title: string;
	notes?: string; // descripción (rich text / markdown)
	private: boolean;
	state: 'active' | 'deleted' | 'draft';
	organization?: CkanOrganization;
	resources: CkanResource[];
	tags: CkanTag[];
	groups: CkanGroup[];
	extras: CkanExtra[];
	metadata_created: string;
	metadata_modified: string;
	creator_user_id?: string;
	maintainer?: string;
	maintainer_email?: string;
	author?: string;
	author_email?: string;
	license_id?: string;
	license_title?: string;
	url?: string;
	version?: string;
	// Tipo de dataset (CKAN puede tener múltiples tipos)
	type?: string;
}
