<script>
    import { onMount } from 'svelte';
    import AliasForm from '../components/AliasForm.svelte';
    import { settings } from '../services/settings.service.js';
    import { mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';
    import { hasOriginAccess, requestOriginAccess } from '../lib/browser.js';

    let { onOpenSettings } = $props();

    /** @type {'loading' | 'needs-access' | 'ready' | 'error'} */
    let status = $state('loading');
    let refreshing = $state(false);
    let error = $state('');
    let domains = $state([]);
    let mailboxes = $state([]);

    const serverHost = $derived(new URL($settings.mailcowUrl).host);

    async function load() {
        // Show the last known lists right away, then refresh them.
        const cached = await mailcowService.getCachedLists();
        if (cached) {
            ({ domains, mailboxes } = cached);
            status = 'ready';
        }

        if (!(await hasOriginAccess($settings.mailcowUrl))) {
            status = 'needs-access';
            return;
        }

        refreshing = true;
        try {
            ({ domains, mailboxes } = await mailcowService.loadLists());
            status = 'ready';
        } catch (e) {
            error = e.message;
            if (cached) notifications.error(e.message);
            else status = 'error';
        } finally {
            refreshing = false;
        }
    }

    async function grantAccess() {
        if (await requestOriginAccess($settings.mailcowUrl)) {
            status = 'loading';
            await load();
        } else {
            notifications.error('Accès refusé : l\'extension ne peut pas contacter le serveur');
        }
    }

    onMount(load);
</script>

<div class="p-4">
    {#if status === 'loading'}
        <div class="flex justify-center p-6">
            <span class="loading loading-spinner loading-md"></span>
        </div>
    {:else if status === 'needs-access'}
        <div class="space-y-3 text-sm">
            <p>L'extension a besoin de ton autorisation pour contacter <strong>{serverHost}</strong>.</p>
            <button class="btn btn-primary w-full" onclick={grantAccess}>Autoriser l'accès</button>
        </div>
    {:else if status === 'error'}
        <div class="space-y-3">
            <div role="alert" class="alert alert-error text-sm">{error}</div>
            <div class="flex gap-2">
                <button class="btn flex-1" onclick={load} disabled={refreshing}>
                    {#if refreshing}<span class="loading loading-spinner loading-sm"></span>{/if}
                    Réessayer
                </button>
                <button class="btn btn-ghost flex-1" onclick={onOpenSettings}>Paramètres</button>
            </div>
        </div>
    {:else if domains.length === 0 || mailboxes.length === 0}
        <div role="alert" class="alert alert-warning text-sm">
            Aucun {domains.length === 0 ? 'domaine' : 'boîte mail'} actif sur ce serveur Mailcow.
        </div>
    {:else}
        <AliasForm {domains} {mailboxes} {refreshing} />
    {/if}
</div>
