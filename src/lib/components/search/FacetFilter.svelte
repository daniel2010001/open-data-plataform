<script lang="ts">
	import { cn } from '$lib/utils';
	import { ChevronDown } from 'lucide-svelte';

	let {
		title = '',
		items = [] as { name: string; display_name: string; count: number }[],
		selected = [] as string[],
		onselect,
		class: className = '',
	}: {
		title?: string;
		items?: { name: string; display_name: string; count: number }[];
		selected?: string[];
		onselect?: (name: string) => void;
		class?: string;
	} = $props();

	let showAll = $state(false);
	const DEFAULT_SHOW = 5;
	const visibleItems = $derived(showAll ? items : items.slice(0, DEFAULT_SHOW));
	const hasMore = $derived(items.length > DEFAULT_SHOW);
</script>

<fieldset class={cn('space-y-2', className)}>
	<legend class="mb-2 text-sm font-semibold text-foreground">
		{title}
	</legend>

	{#each visibleItems as item (item.name)}
		<label
			class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
		>
			<input
				type="checkbox"
				checked={selected.includes(item.name)}
				onchange={() => onselect?.(item.name)}
				class="size-4 rounded border-gray-300 text-primary focus:ring-primary"
			/>
			<span class="flex-1 truncate">{item.display_name}</span>
			<span class="text-xs text-muted-foreground">{item.count}</span>
		</label>
	{/each}

	{#if hasMore}
		<button
			type="button"
			onclick={() => (showAll = !showAll)}
			class="flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
		>
			{showAll ? 'Mostrar menos' : `Mostrar ${items.length - DEFAULT_SHOW} más`}
			<ChevronDown
				class="size-3 transition-transform {showAll ? 'rotate-180' : ''}"
			/>
		</button>
	{/if}
</fieldset>
