<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import Button from '$lib/components/ui/button/button.svelte';

	let {
		current = 1,
		total = 1,
		onchange,
		class: className = '',
	}: {
		current?: number;
		total?: number;
		onchange?: (page: number) => void;
		class?: string;
	} = $props();

	const pages = $derived.by(() => {
		if (total <= 7) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}

		const result: (number | 'ellipsis')[] = [];
		result.push(1);

		if (current > 3) result.push('ellipsis');

		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);

		for (let i = start; i <= end; i++) {
			result.push(i);
		}

		if (current < total - 2) result.push('ellipsis');
		result.push(total);

		return result;
	});
</script>

{#if total > 1}
	<nav
		class={cn('flex items-center justify-center gap-1', className)}
		aria-label="Paginación"
	>
		<Button
			variant="ghost"
			size="sm"
			disabled={current <= 1}
			onclick={() => onchange?.(current - 1)}
			aria-label="Página anterior"
		>
			<ChevronLeft class="size-4" />
		</Button>

		{#each pages as page (typeof page === 'number' ? page : `ellipsis-${Math.random()}`)}
			{#if page === 'ellipsis'}
				<span class="px-2 text-sm text-muted-foreground">…</span>
			{:else}
				<Button
					variant={page === current ? 'default' : 'ghost'}
					size="sm"
					onclick={() => onchange?.(page)}
					aria-label={`Ir a página ${page}`}
					aria-current={page === current ? 'page' : undefined}
				>
					{page}
				</Button>
			{/if}
		{/each}

		<Button
			variant="ghost"
			size="sm"
			disabled={current >= total}
			onclick={() => onchange?.(current + 1)}
			aria-label="Página siguiente"
		>
			<ChevronRight class="size-4" />
		</Button>
	</nav>
{/if}
