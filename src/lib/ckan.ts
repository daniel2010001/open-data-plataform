import { env } from '$lib/env';
import { createCkanClient } from './api/client';
import type { CkanClient } from './api/client';

let client: CkanClient | null = null;

/**
 * Obtener la instancia singleton del cliente CKAN.
 *
 * Usa env.CKAN_URL si está definida (producción), o ruta relativa
 * para que el proxy de Vite (desarrollo) derive a la instancia CKAN.
 */
export function getCkanClient(): CkanClient {
	if (!client) {
		client = createCkanClient({ baseUrl: env.CKAN_URL });
	}
	return client;
}
