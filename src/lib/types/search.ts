import type { CkanPackage, CkanFacet } from './ckan';

export interface SearchFilters {
	q: string;
	organizations: string[];
	tags: string[];
	resFormat: string[];
	visibility: ('private' | 'public')[];
	dateFrom?: string;
	dateTo?: string;
}

export interface SearchState {
	query: string;
	filters: SearchFilters;
	results: CkanPackage[];
	total: number;
	loading: boolean;
	error: string | null;
	facets: Record<string, CkanFacet>;
	currentPage: number;
	pageSize: number;
}
