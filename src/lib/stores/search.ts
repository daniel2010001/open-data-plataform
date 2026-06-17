import { writable, derived } from 'svelte/store';
import type { CkanPackage, CkanFacet } from '$lib/types/ckan';

export interface SearchState {
	query: string;
	filters: Record<string, string[]>;
	results: CkanPackage[];
	total: number;
	loading: boolean;
	error: string | null;
	facets: Record<string, CkanFacet>;
	currentPage: number;
	pageSize: number;
}

const initialState: SearchState = {
	query: '',
	filters: {},
	results: [],
	total: 0,
	loading: false,
	error: null,
	facets: {},
	currentPage: 1,
	pageSize: 20,
};

function createSearchStore() {
	const { subscribe, set, update } = writable<SearchState>(initialState);

	return {
		subscribe,

		/** Actualizar query de búsqueda */
		setQuery(query: string) {
			update((state) => ({ ...state, query, currentPage: 1 }));
		},

		/** Establecer resultados de búsqueda */
		setResults(results: CkanPackage[], total: number, facets: Record<string, CkanFacet>) {
			update((state) => ({
				...state,
				results,
				total,
				facets,
				loading: false,
				error: null,
			}));
		},

		/** Agregar/quitar filtro */
		toggleFilter(field: string, value: string) {
			update((state) => {
				const current = state.filters[field] ?? [];
				const updated = current.includes(value)
					? current.filter((v) => v !== value)
					: [...current, value];

				return {
					...state,
					filters: { ...state.filters, [field]: updated },
					currentPage: 1,
				};
			});
		},

		/** Limpiar todos los filtros */
		clearFilters() {
			update((state) => ({ ...state, filters: {}, currentPage: 1 }));
		},

		/** Ir a página */
		setPage(page: number) {
			update((state) => ({ ...state, currentPage: page }));
		},

		setLoading(loading: boolean) {
			update((state) => ({ ...state, loading }));
		},

		setError(error: string) {
			update((state) => ({ ...state, error, loading: false }));
		},

		reset() {
			set(initialState);
		},
	};
}

export const search = createSearchStore();

// Derivados útiles
export const totalPages = derived(search, ($s) =>
	Math.ceil($s.total / $s.pageSize)
);
export const hasActiveFilters = derived(search, ($s) =>
	Object.values($s.filters).some((f) => f.length > 0)
);
export const activeFilterCount = derived(search, ($s) =>
	Object.values($s.filters).reduce((acc, f) => acc + f.length, 0)
);
