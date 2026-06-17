// Utilidades para parseo y análisis de CSV (papaparse)
// Preparado para el módulo de análisis de datos

import Papa from 'papaparse';

export interface CsvParseResult {
	headers: string[];
	rows: Record<string, unknown>[];
	types: Record<string, CsvColumnType>;
	totalRows: number;
	preview: Record<string, unknown>[]; // primeras N filas
}

export type CsvColumnType = 'text' | 'number' | 'date' | 'boolean' | 'empty';

/** Detectar tipo de columna basado en valores */
function detectColumnType(values: unknown[]): CsvColumnType {
	const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== '');
	if (nonEmpty.length === 0) return 'empty';

	const samples = nonEmpty.slice(0, 20);
	const allNumbers = samples.every((v) => !isNaN(Number(v)) && v !== '');
	if (allNumbers) return 'number';

	const allBooleans = samples.every(
		(v) => v === 'true' || v === 'false' || v === true || v === false
	);
	if (allBooleans) return 'boolean';

	const dateRegex = /^\d{4}-\d{2}-\d{2}/;
	const allDates = samples.every((v) => dateRegex.test(String(v)));
	if (allDates) return 'date';

	return 'text';
}

/** Parsear CSV y devolver metadata */
export function parseCsv(
	content: string,
	previewRows = 20
): CsvParseResult {
	const result = Papa.parse<Record<string, unknown>>(content, {
		header: true,
		dynamicTyping: false, // lo hacemos manual para controlar tipos
		skipEmptyLines: true,
	});

	if (result.errors.length > 0) {
		console.warn('CSV parse errors:', result.errors);
	}

	const headers = result.meta.fields ?? [];
	const rows = result.data;
	const preview = rows.slice(0, previewRows);

	// Detectar tipos por columna
	const types: Record<string, CsvColumnType> = {};
	for (const header of headers) {
		const values = rows.map((r) => r[header]);
		types[header] = detectColumnType(values);
	}

	return {
		headers,
		rows,
		types,
		totalRows: rows.length,
		preview,
	};
}

/** Obtener estadísticas básicas de una columna numérica */
export function getNumericStats(values: number[]) {
	const valid = values.filter((v) => !isNaN(v));
	if (valid.length === 0) return null;

	const sorted = [...valid].sort((a, b) => a - b);
	const sum = valid.reduce((acc, v) => acc + v, 0);

	return {
		min: sorted[0],
		max: sorted[sorted.length - 1],
		mean: sum / valid.length,
		median: sorted[Math.floor(sorted.length / 2)],
		count: valid.length,
	};
}
