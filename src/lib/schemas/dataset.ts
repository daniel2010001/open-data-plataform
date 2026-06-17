import { z } from 'zod/v4';

// NOTA: Zod v4 cambia algunas APIs. Si usás Zod v3, reemplazá `z.object` sin cambios.
// Para Zod v4, la sintaxis es compatible hacia atrás en la mayoría de los casos.

export const datasetCreateSchema = z.object({
	name: z
		.string()
		min(2, 'El slug debe tener al menos 2 caracteres')
		.max(100)
		.regex(/^[a-z0-9_-]+$/, 'Solo minúsculas, números, guiones y guión bajo'),
	title: z
		.string()
		.min(3, 'El título debe tener al menos 3 caracteres')
		.max(200, 'El título no puede exceder 200 caracteres'),
	notes: z.string().max(5000).optional(),
	owner_org: z.string().uuid('Debe seleccionar una organización'),
	private: z.boolean().default(true),
	license_id: z.string().optional(),
	tag_string: z.string().optional(),
	// extras se pasan como key-value
	extras: z
		.array(
			z.object({
				key: z.string(),
				value: z.string(),
			})
		)
		.optional(),
});

export type DatasetCreateInput = z.infer<typeof datasetCreateSchema>;

export const datasetUpdateSchema = datasetCreateSchema.partial();
export type DatasetUpdateInput = z.infer<typeof datasetUpdateSchema>;

export const searchSchema = z.object({
	q: z.string().default(''),
	organization: z.string().optional(),
	tags: z.string().optional(),
	res_format: z.string().optional(),
	license_id: z.string().optional(),
	sort: z.string().default('metadata_modified desc'),
	rows: z.coerce.number().min(1).max(100).default(20),
	start: z.coerce.number().min(0).default(0),
});

export type SearchInput = z.infer<typeof searchSchema>;
