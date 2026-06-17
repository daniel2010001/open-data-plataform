// Cliente HTTP para la API REST de CKAN
// Maneja autenticación, errores, y formato de respuestas

import { CkanApiError } from '$lib/types/api';
import type { ApiClientConfig } from '$lib/types/api';

export function createCkanClient(config: ApiClientConfig) {
	const { baseUrl, apiKey, timeout = 10000 } = config;

	async function request<T>(
		action: string,
		data?: Record<string, unknown>,
		method: 'GET' | 'POST' = 'POST'
	): Promise<T> {
		const url = `${baseUrl.replace(/\/$/, '')}/api/3/action/${action}`;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (apiKey) {
			headers['Authorization'] = apiKey;
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: method === 'POST' && data ? JSON.stringify(data) : undefined,
				signal: controller.signal,
			});

			const json = await response.json();

			if (!response.ok || !json.success) {
				throw new CkanApiError(
					json.error?.message ?? `HTTP ${response.status}`,
					response.status,
					json.error?.__type
				);
			}

			return json.result as T;
		} catch (err) {
			if (err instanceof CkanApiError) throw err;
			if (err instanceof DOMException && err.name === 'AbortError') {
				throw new CkanApiError('Request timed out', 408);
			}
			throw new CkanApiError(
				err instanceof Error ? err.message : 'Unknown error',
				0
			);
		} finally {
			clearTimeout(timer);
		}
	}

	return {
		/** GET request (para acciones que solo leen) */
		get<T>(action: string, params?: Record<string, unknown>): Promise<T> {
			// CKAN usa POST incluso para lecturas, pero algunas acciones soportan GET
			return request<T>(action, params, 'GET');
		},
		/** POST request (estándar CKAN) */
		post<T>(action: string, data?: Record<string, unknown>): Promise<T> {
			return request<T>(action, data, 'POST');
		},
		/** Config actual (útil para stores de auth) */
		getConfig: () => config,
	};
}

export type CkanClient = ReturnType<typeof createCkanClient>;
