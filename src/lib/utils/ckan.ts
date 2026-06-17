// Utilidades para trabajar con la API de CKAN

import type { CkanExtra } from '$lib/types/ckan';

/** Convertir objeto plano a extras CKAN */
export function toExtras(obj: Record<string, string | undefined>): CkanExtra[] {
	return Object.entries(obj)
		.filter(([, v]) => v !== undefined && v !== '')
		.map(([key, value]) => ({ key, value: value! }));
}

/** Construir string filter query (fq) desde filtros seleccionados */
export function buildFilterQuery(
	filters: Record<string, string[]>
): string | undefined {
	const clauses: string[] = [];

	for (const [field, values] of Object.entries(filters)) {
		if (values.length === 0) continue;
		if (values.length === 1) {
			clauses.push(`${field}:${escapeFqValue(values[0])}`);
		} else {
			const joined = values.map(escapeFqValue).join(' OR ');
			clauses.push(`(${joined})`);
		}
	}

	return clauses.length > 0 ? clauses.join(' AND ') : undefined;
}

function escapeFqValue(value: string): string {
	// Escapar caracteres especiales de Solr
	if (/[\s:"()!{}\[\]^~*?]/.test(value)) {
		return `"${value.replace(/"/g, '\\"')}"`;
	}
	return value;
}

/** Parsear fecha ISO a formato legible */
export function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString('es-BO', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	} catch {
		return iso;
	}
}

/** Parsear tamaño de archivo a formato legible */
export function formatSize(bytes?: number): string {
	if (bytes === undefined || bytes === null) return '—';
	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}
	return `${value.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}
