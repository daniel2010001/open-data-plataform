// ─── Configuración tipada con Zod ─────────────────────────────
// Centraliza todas las variables de entorno con validación.
// Las public (`PUBLIC_*`) vienen de SvelteKit ($env/static/public).

import { PUBLIC_CKAN_URL, PUBLIC_APP_URL } from '$env/static/public';
import { z } from 'zod';

const envSchema = z.object({
	/**
	 * URL base de CKAN.
	 * - En desarrollo: vacío → usa el proxy de Vite (/api → localhost:5000)
	 * - En producción: https://ckan.mi-universidad.edu.bo
	 */
	CKAN_URL: z.string().default(''),

	/** URL pública del frontend (para links, SEO, etc.) */
	APP_URL: z.string().url().default('http://localhost:5173'),
});

export const env = envSchema.parse({
	CKAN_URL: PUBLIC_CKAN_URL,
	APP_URL: PUBLIC_APP_URL,
});

// Tipo inferido del schema (útil para expandir después)
export type Env = z.infer<typeof envSchema>;
