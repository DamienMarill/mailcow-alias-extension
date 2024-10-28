<script>
    import { isConfigured } from '../services/settings.service.js';
    import { push } from 'svelte-spa-router';
    import AliasForm from '../components/AliasForm.svelte';
</script>

{#if $isConfigured}
    <div class="p-4">
        <h2 class="text-xl font-bold mb-4">Créer un alias</h2>
        <AliasForm />
    </div>
{:else}
    <div class="p-4">
        <div class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
                <h3 class="font-bold">Configuration requise !</h3>
                <div class="text-sm">Veuillez configurer vos paramètres Mailcow.</div>
            </div>
            <button class="btn btn-sm" on:click={() => push('/settings')}>
                Configurer
            </button>
        </div>
    </div>
{/if}
