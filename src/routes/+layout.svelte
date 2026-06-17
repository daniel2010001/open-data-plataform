<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white shadow-sm">
		<nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
			<a href="/" class="flex items-center gap-2">
				<span class="text-xl font-bold text-blue-700">Datos UMSS</span>
			</a>

			<div class="flex items-center gap-4">
				<a href="/search" class="text-sm font-medium text-gray-600 hover:text-blue-600">
					Catálogo
				</a>
				<a href="/about" class="text-sm font-medium text-gray-600 hover:text-blue-600">
					Acerca de
				</a>

				{#if false}
					<!-- TODO: cuando tengamos auth -->
					<a href="/dashboard" class="text-sm font-medium text-gray-600 hover:text-blue-600">
						Dashboard
					</a>
					<a href="/auth/logout" class="text-sm font-medium text-red-500 hover:text-red-700">
						Salir
					</a>
				{:else}
					<a
						href="/auth/login"
						class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
					>
						Iniciar Sesión
					</a>
				{/if}
			</div>
		</nav>
	</header>

	<!-- Main content -->
	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-gray-200 bg-white">
		<div class="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
			<p>Universidad Mayor de San Simón — Plataforma de Datos Abiertos</p>
		</div>
	</footer>
</div>
