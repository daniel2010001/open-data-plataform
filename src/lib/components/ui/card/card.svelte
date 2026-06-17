<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		class: className = '',
		children,
		...rest
	}: {
		class?: string;
		children?: Snippet;
	} & Record<string, unknown> = $props();
</script>

<div class={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...rest}>
	{@render children?.()}
</div>
