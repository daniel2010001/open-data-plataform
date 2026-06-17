<script lang="ts">
	import { Calendar, Building2, FileText } from 'lucide-svelte';
	import { cn, formatDate, formatSize } from '$lib/utils';
	import type { CkanPackage } from '$lib/types/ckan';
	import Card from '$lib/components/ui/card/card.svelte';

	let {
		dataset,
		class: className = '',
	}: {
		dataset: CkanPackage;
		class?: string;
	} = $props();

	const resourceFormats = $derived(
		dataset.resources
			?.map((r) => r.format?.toUpperCase())
			.filter(Boolean)
			.slice(0, 4) ?? []
	);

	const moreFormats = $derived(
		dataset.resources ? dataset.resources.length - resourceFormats.length : 0
	);

	const description = $derived(
		dataset.notes
			? dataset.notes.replace(/<[^>]*>/g, '').slice(0, 200)
			: 'Sin descripción'
	);
</script>

<Card class={cn('p-5', className)}>
	<div class="space-y-3">
		<!-- Header -->
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0 flex-1">
				<a
					href={`/dataset/${dataset.id}`}
					class="text-base font-semibold text-foreground hover:text-primary hover:underline"
				>
					{dataset.title || dataset.name}
				</a>
			</div>
			{#if dataset.private}
				<span
					class="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800"
				>
					Privado
				</span>
			{/if}
		</div>

		<!-- Description -->
		<p class="text-sm leading-relaxed text-muted-foreground line-clamp-2">
			{description}
		</p>

		<!-- Metadata row -->
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
			{#if dataset.organization}
				<span class="inline-flex items-center gap-1">
					<Building2 class="size-3" />
					{dataset.organization.title}
				</span>
			{/if}
			<span class="inline-flex items-center gap-1">
				<Calendar class="size-3" />
				{formatDate(dataset.metadata_modified)}
			</span>
		</div>

		<!-- Tags + Formats -->
		<div class="flex flex-wrap items-center gap-2">
			{#each resourceFormats as format}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
				>
					<FileText class="size-3" />
					{format}
				</span>
			{/each}
			{#if moreFormats > 0}
				<span class="text-[11px] text-muted-foreground">+{moreFormats} más</span>
			{/if}

			{#if dataset.tags?.length}
				<span class="mx-1 text-muted-foreground/30">|</span>
				{#each dataset.tags.slice(0, 3) as tag}
					<span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
						{tag.display_name || tag.name}
					</span>
				{/each}
				{#if dataset.tags.length > 3}
					<span class="text-[11px] text-muted-foreground"
						>+{dataset.tags.length - 3}</span
					>
				{/if}
			{/if}
		</div>
	</div>
</Card>
