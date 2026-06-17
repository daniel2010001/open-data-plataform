import { writable, derived } from 'svelte/store';
import type { CkanUser } from '$lib/types/ckan';

export interface AuthState {
	token: string | null;
	user: CkanUser | null;
	loading: boolean;
	error: string | null;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		token: null,
		user: null,
		loading: false,
		error: null,
	});

	return {
		subscribe,

		/** Iniciar sesión con API Key de CKAN */
		login(token: string, user: CkanUser) {
			update((state) => ({ ...state, token, user, error: null }));
		},

		/** Cerrar sesión */
		logout() {
			update((state) => ({
				...state,
				token: null,
				user: null,
				error: null,
			}));
		},

		/** Marcar loading */
		setLoading(loading: boolean) {
			update((state) => ({ ...state, loading }));
		},

		/** Registrar error */
		setError(error: string) {
			update((state) => ({ ...state, error, loading: false }));
		},

		/** Resetear estado */
		reset() {
			set({ token: null, user: null, loading: false, error: null });
		},
	};
}

export const auth = createAuthStore();

// Stores derivados
export const isAuthenticated = derived(auth, ($auth) => $auth.token !== null);
export const isSuperAdmin = derived(
	auth,
	($auth) => $auth.user?.capacity === 'admin' || $auth.user?.capacity === 'superadmin'
);
export const currentUser = derived(auth, ($auth) => $auth.user);
