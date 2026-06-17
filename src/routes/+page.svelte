<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import { env } from '$lib/env';
	import { createCkanClient } from '$lib/api/client';
	import { createDatasetApi } from '$lib/api/datasets';
	import { getMockSearchResult, MOCK_ORGS } from '$lib/mock/data';
	import { onMount } from 'svelte';

	let stats = $state({
		datasets: 0,
		organizations: 0,
		loading: true,
		error: null as string | null,
	});

	onMount(async () => {
		try {
			const client = createCkanClient({ baseUrl: env.CKAN_URL });
			const datasetApi = createDatasetApi(client);
			const searchResult = await datasetApi.search({ limit: 0 });
			stats.datasets = searchResult.count;
		} catch {
			// Fallback: mock si CKAN no responde
			const mock = getMockSearchResult();
			stats.datasets = mock.count;
		}
		stats.organizations = MOCK_ORGS.length;
		stats.loading = false;
	});
</script>

<section class="bg-gradient-to-br from-primary to-primary/80">
	<div class="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
		<h1 class="text-4xl font-bold text-primary-foreground sm:text-5xl lg:text-6xl">
			Datos Abiertos UMSS
		</h1>
		<p class="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">
			Plataforma centralizada para la gestión, publicación y descubrimiento de datos
			académicos y administrativos de la Universidad Mayor de San Simón.
		</p>

		<div class="mt-8 flex justify-center gap-4">
			<a href="/search">
				<Button variant="outline" size="lg">
					Explorar Catálogo
				</Button>
			</a>
			<a href="/about">
				<Button variant="secondary" size="lg">
					Más Información
				</Button>
			</a>
		</div>
	</div>
</section>

<!-- Stats -->
<section class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
	{#if stats.loading}
		<p class="text-center text-muted-foreground">Conectando con CKAN...</p>
	{:else if stats.error}
		<Card>
			<div class="p-6 text-center">
				<p class="font-semibold text-destructive">No se pudo conectar con CKAN.</p>
				<p class="mt-1 text-sm text-muted-foreground">{stats.error}</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Configurá
					<code class="rounded bg-muted px-1">VITE_CKAN_URL</code>
					en tu archivo
					<code class="rounded bg-muted px-1">.env</code>.
				</p>
			</div>
		</Card>
	{:else}
		<div class="grid gap-6 sm:grid-cols-3">
			<Card>
				<div class="p-6 text-center">
					<p class="text-3xl font-bold text-primary">{stats.datasets}</p>
					<p class="mt-1 text-sm text-muted-foreground">Datasets disponibles</p>
				</div>
			</Card>
			<Card>
				<div class="p-6 text-center">
					<p class="text-3xl font-bold text-primary">{stats.datasets}</p>
					<p class="mt-1 text-sm text-muted-foreground">Organizaciones</p>
				</div>
			</Card>
			<Card>
				<div class="p-6 text-center">
					<p class="text-3xl font-bold text-primary">—</p>
					<p class="mt-1 text-sm text-muted-foreground">Recursos indexados</p>
				</div>
			</Card>
		</div>
	{/if}
</section>

<!-- Features -->
<section class="border-t bg-muted/50">
	<div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
		<h2 class="text-center text-2xl font-bold">¿Qué podés hacer?</h2>

		<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<Card>
				<div class="p-6">
					<h3 class="font-semibold">Buscar y descubrir</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Navegá el catálogo con búsqueda facetada por organización, etiquetas, formato y más.
					</p>
				</div>
			</Card>
			<Card>
				<div class="p-6">
					<h3 class="font-semibold">Visualizar datos</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Previsualizá CSV, PDF, imágenes y JSON directamente en el navegador.
					</p>
				</div>
			</Card>
			<Card>
				<div class="p-6">
					<h3 class="font-semibold">Analizar CSV</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Cargá archivos CSV y generá gráficos interactivos de barras, líneas y más.
					</p>
				</div>
			</Card>
			<Card>
				<div class="p-6">
					<h3 class="font-semibold">Colaborar</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Trabajá en equipos, creá colecciones transversales y gestioná permisos.
					</p>
				</div>
			</Card>
			<Card>
				<div class="p-6">
					<h3 class="font-semibold">Publicar</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Flujo de aprobación de borrador a publicación con control de visibilidad.
					</p>
				</div>
			</Card>
			<Card>
				<div class="p-6">
					<h3 class="font-semibold">API pública</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Accedé a los datasets públicos mediante API REST con API Key.
					</p>
				</div>
			</Card>
		</div>
	</div>
</section>
