// Datos mock para desarrollo sin CKAN conectado
// Simula las respuestas de la API de CKAN

import type { CkanPackage, CkanOrganization, CkanFacet } from '$lib/types/ckan';

export const MOCK_ORGS: CkanOrganization[] = [
	{
		id: 'org-fcyt',
		name: 'fcyt',
		title: 'Facultad de Ciencias y Tecnología',
		description: 'FCyT - UMSS. Investigación en ingeniería, ciencias exactas y tecnología.',
		created: '2024-01-15T10:00:00Z',
		state: 'active',
		image_url: '',
		package_count: 45,
	},
	{
		id: 'org-fcs',
		name: 'fcs',
		title: 'Facultad de Ciencias de la Salud',
		description: 'Medicina, enfermería, odontología y ciencias farmacéuticas.',
		created: '2024-01-15T10:00:00Z',
		state: 'active',
		image_url: '',
		package_count: 28,
	},
	{
		id: 'org-fca',
		name: 'fca',
		title: 'Facultad de Ciencias Agrícolas',
		description: 'Investigación agropecuaria y recursos naturales.',
		created: '2024-01-15T10:00:00Z',
		state: 'active',
		image_url: '',
		package_count: 32,
	},
	{
		id: 'org-rectorado',
		name: 'rectorado',
		title: 'Rectorado UMSS',
		description: 'Administración central de la Universidad Mayor de San Simón.',
		created: '2024-01-10T10:00:00Z',
		state: 'active',
		image_url: '',
		package_count: 15,
	},
	{
		id: 'org-investigacion',
		name: 'direccion-investigacion',
		title: 'Dirección de Investigación',
		description: 'Coordinación y gestión de proyectos de investigación universitarios.',
		created: '2024-02-01T10:00:00Z',
		state: 'active',
		image_url: '',
		package_count: 22,
	},
];

function generateMockDatasets(count: number): CkanPackage[] {
	const orgs = MOCK_ORGS;
	const tags = [
		'presupuesto', 'educación', 'investigación', 'salud', 'agricultura',
		'tecnología', 'infraestructura', 'docentes', 'estudiantes', 'recursos',
		'calidad', 'proyectos', 'publicaciones', 'laboratorios', 'becas',
	];
	const formats = ['CSV', 'PDF', 'XLSX', 'JSON', 'GeoJSON', 'RDF', 'XML', 'PNG'];
	const licenses = [
		'cc-by', 'cc-by-sa', 'cc-zero', 'odbl', 'other-open',
	];

	const datasets: CkanPackage[] = [];

	const baseNames = [
		'Presupuesto anual ejecutado por facultad',
		'Matrícula estudiantil por carrera y gestión',
		'Producción científica del personal docente',
		'Resultados de evaluación docente por semestre',
		'Proyectos de investigación activos',
		'Indicadores de eficiencia terminal',
		'Distribución de becas por facultad',
		'Infraestructura de laboratorios y equipamiento',
		'Publicaciones indexadas por departamento',
		'Consumo energético por edificio',
		'Tasas de graduación por cohorte',
		'Convenios interinstitucionales activos',
		'Recursos bibliográficos digitales',
		'Programas de posgrado ofertados',
		'Encuestas de satisfacción estudiantil',
	];

	const descs = [
		'Datos del presupuesto ejecutado por cada facultad durante la gestión, incluyendo gastos corrientes, de inversión y proyectos. Contiene series históricas desde 2018.',
		'Registro detallado de estudiantes matriculados por carrera, semestre y gestión académica. Incluye datos demográficos y distribución por sexo.',
		'Artículos científicos, libros y capítulos publicados por docentes e investigadores de la universidad. Indexado por Scopus, WoS y Latindex.',
		'Resultados de las evaluaciones de desempeño docente realizadas por los estudiantes al finalizar cada semestre académico.',
		'Catálogo de proyectos de investigación financiados con fondos internos y externos. Incluye estado, presupuesto y resultados esperados.',
		'Indicadores de eficiencia terminal, abandono y duración promedio de estudios por carrera y facultad. Series 2015-2025.',
		'Distribución de becas internas y externas otorgadas a estudiantes de grado y posgrado, por tipo de beca y facultad.',
		'Inventario de laboratorios, equipos científicos y capacidad instalada de las diferentes facultades y centros de investigación.',
		'Registro de publicaciones científicas indexadas en bases de datos internacionales, clasificadas por área temática y departamento.',
		'Datos de consumo eléctrico, agua y gas de los edificios universitarios. Mediciones mensuales por punto de consumo.',
		'Tasas de graduación, deserción y duración promedio de estudios por cohorte de ingreso y carrera.',
		'Registro de convenios nacionales e internacionales vigentes, incluyendo instituciones socias, objetivos y fechas.',
		'Catálogo de recursos bibliográficos digitales disponibles en el sistema de bibliotecas de la universidad.',
		'Oferta académica de programas de maestría, doctorado y especialización por facultad y modalidad.',
		'Resultados de encuestas de satisfacción aplicadas a estudiantes de grado y posgrado sobre servicios universitarios.',
	];

	for (let i = 0; i < count; i++) {
		const org = orgs[i % orgs.length];
		const idx = i % baseNames.length;
		const name = `${org.name}-dataset-${i + 1}`;

		const datasetTags = [
			tags[i % tags.length],
			tags[(i + 3) % tags.length],
			tags[(i + 7) % tags.length],
		].filter((v, idx2, arr) => arr.indexOf(v) === idx2); // unique

		const resourceCount = 1 + (i % 4);
		const resources = Array.from({ length: resourceCount }, (_, ri) => ({
			id: `res-${i}-${ri}`,
			package_id: `mock-${i}`,
			name: `Datos ${baseNames[idx].toLowerCase()}${ri > 0 ? ` - parte ${ri + 1}` : ''}`,
			description: `Archivo de datos ${ri + 1} de ${resourceCount}`,
			format: formats[(i + ri) % formats.length],
			url: `https://data.umss.edu.bo/dataset/${name}/resource/res-${i}-${ri}`,
			resource_type: 'file',
			mimetype: formats[(i + ri) % formats.length] === 'CSV' ? 'text/csv' : 'application/octet-stream',
			size: Math.floor(Math.random() * 5_000_000) + 10_000,
			created: '2024-06-15T10:00:00Z',
			last_modified: '2025-03-10T14:30:00Z',
			state: 'active' as const,
			position: ri,
			hash: `sha256-${Math.random().toString(36).slice(2)}`,
		}));

		const createdDate = new Date(2024, 0, 1);
		createdDate.setDate(createdDate.getDate() + i * 14);
		const modifiedDate = new Date(createdDate);
		modifiedDate.setDate(modifiedDate.getDate() + Math.floor(Math.random() * 180));

		datasets.push({
			id: `mock-${i}`,
			name,
			title: `${baseNames[idx]} - ${org.title}`,
			notes: `<p>${descs[idx]}</p><p>Datos actualizados a la gestión 2025. Para consultas técnicas contactar a la unidad de transparencia de la ${org.title}.</p>`,
			private: i % 5 === 0,
			state: 'active' as const,
			organization: org,
			resources,
			tags: datasetTags.map((t) => ({
				id: `tag-${t}`,
				name: t,
				display_name: t.charAt(0).toUpperCase() + t.slice(1),
				state: 'active' as const,
			})),
			groups: [],
			extras: [
				{ key: 'frequency', value: ['Mensual', 'Trimestral', 'Anual', 'Semestral'][i % 4] },
				{ key: 'language', value: 'es' },
				{ key: 'spatial', value: 'Cochabamba, Bolivia' },
			],
			metadata_created: createdDate.toISOString(),
			metadata_modified: modifiedDate.toISOString(),
			creator_user_id: 'admin-umss',
			license_id: licenses[i % licenses.length],
			license_title: licenses[i % licenses.length] === 'cc-by' ? 'Creative Commons Attribution' : 'Open Data Commons',
		});
	}

	return datasets;
}

export const MOCK_DATASETS = generateMockDatasets(45);

export function getMockSearchResult() {
	const orgFacets: Record<string, number> = {};
	const formatFacets: Record<string, number> = {};
	const tagFacets: Record<string, number> = {};
	const licenseFacets: Record<string, number> = {};

	for (const ds of MOCK_DATASETS) {
		const orgName = ds.organization?.name ?? 'unknown';
		orgFacets[orgName] = (orgFacets[orgName] ?? 0) + 1;

		for (const r of ds.resources) {
			const fmt = r.format ?? 'OTHER';
			formatFacets[fmt] = (formatFacets[fmt] ?? 0) + 1;
		}

		for (const t of ds.tags) {
			tagFacets[t.name] = (tagFacets[t.name] ?? 0) + 1;
		}

		const lic = ds.license_id ?? 'other';
		licenseFacets[lic] = (licenseFacets[lic] ?? 0) + 1;
	}

	function toFacetItems(map: Record<string, number>, labelMap?: Record<string, string>): { name: string; display_name: string; count: number }[] {
		return Object.entries(map)
			.sort(([, a], [, b]) => b - a)
			.map(([name, count]) => ({
				name,
				display_name: labelMap?.[name] ?? name.charAt(0).toUpperCase() + name.slice(1),
				count,
			}));
	}

	const orgLabels: Record<string, string> = {};
	for (const org of MOCK_ORGS) {
		orgLabels[org.name] = org.title;
	}

	const facets: Record<string, CkanFacet> = {
		organization: { title: 'Organization', items: toFacetItems(orgFacets, orgLabels) },
		res_format: { title: 'Format', items: toFacetItems(formatFacets) },
		tags: { title: 'Tags', items: toFacetItems(tagFacets) },
		license_id: { title: 'License', items: toFacetItems(licenseFacets) },
	};

	return {
		count: MOCK_DATASETS.length,
		results: MOCK_DATASETS,
		sort: 'metadata_modified desc',
		search_facets: facets,
	};
}
