<script lang="ts">
	import { Search, X } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	let {
		value = '',
		placeholder = 'Buscar datasets...',
		class: className = '',
		onchange,
		onsubmit,
	}: {
		value?: string;
		placeholder?: string;
		class?: string;
		onchange?: (value: string) => void;
		onsubmit?: (value: string) => void;
	} = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	// Inicializamos con el valor del prop; el $effect sincroniza cambios externos
	let localValue = $state(value);

	// Sync externo → interno
	$effect(() => {
		if (value !== localValue) {
			localValue = value;
		}
	});

	// Debounce: 300ms
	let debounceTimer: ReturnType<typeof setTimeout>;
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		localValue = target.value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			onchange?.(localValue);
		}, 300);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		clearTimeout(debounceTimer);
		onchange?.(localValue);
		onsubmit?.(localValue);
	}

	function clear() {
		localValue = '';
		onchange?.('');
		inputEl?.focus();
	}

	// Keyboard shortcut: Cmd/Ctrl+K to focus
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			inputEl?.focus();
		}
		if (e.key === 'Escape') {
			inputEl?.blur();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<form role="search" onsubmit={handleSubmit} class={cn('relative', className)}>
	<Search
		class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
	/>

	<input
		bind:this={inputEl}
		type="search"
		placeholder={placeholder}
		value={localValue}
		oninput={handleInput}
		aria-label="Buscar datasets"
		class="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-20 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	/>

	<div class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
		{#if localValue}
			<button
				type="button"
				onclick={clear}
				aria-label="Limpiar búsqueda"
				class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
			>
				<X class="size-4" />
			</button>
		{/if}
		<kbd
			class="hidden rounded-md border border-input bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline"
		>
			⌘K
		</kbd>
	</div>
</form>
