// Tipos de dominio para datasets con metadata parseada de CKAN extras
import type { CkanPackage, CkanExtra } from './ckan';

// ─── Extras tipados ──────────────────────────────────────────────────
export interface DatasetExtras {
	frequency?: string; // frecuencia de actualización
	language?: string; // idioma de los datos
	spatial?: string; // cobertura geográfica
	temporal_start?: string;
	temporal_end?: string;
	quality?: string; // indicador de calidad
	provenance?: string; // procedencia
	contact_name?: string;
	contact_email?: string;
}

// ─── Helper: convertir extras CKAN a objeto tipado ───────────────────
export function parseExtras<T extends Record<string, string>>(
	extras: CkanExtra[]
): Partial<T> {
	return extras.reduce(
		(acc, { key, value }) => {
			(acc as Record<string, string>)[key] = value;
			return acc;
		},
		{} as Partial<T>
	);
}

// ─── Dataset enriquecido con metadata parseada ───────────────────────
export type DatasetWithMetadata = CkanPackage & {
	parsedExtras: Partial<DatasetExtras>;
};

// ─── Estados del ciclo de vida (mapeados desde extras o state) ──────
export type DatasetLifecycle = 'draft' | 'review' | 'approved' | 'published';
export type DatasetVisibility = 'private' | 'internal' | 'public';
export type AccessStatus = 'accessible' | 'readonly' | 'locked';
