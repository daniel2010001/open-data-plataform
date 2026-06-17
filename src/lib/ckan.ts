import { createCkanClient } from './api/client';
import type { CkanClient } from './api/client';

let client: CkanClient | null = null;

/**
 * Obtener la instancia singleton del cliente CKAN.
 * Requiere VITE_CKAN_URL en variables de entorno.
 */
export function getCkanClient(): CkanClient {
	if (!client) {
		const baseUrl = import.meta.env.VITE_CKAN_URL;
		if (!baseUrl) {
			throw new Error(
				'VITE_CKAN_URL no está definida. Creá un archivo .env o .env.local con VITE_CKAN_URL=https://tu-ckan-instancia.com'
			);
		}
		client = createCkanClient({ baseUrl });
	}
	return client;
}
