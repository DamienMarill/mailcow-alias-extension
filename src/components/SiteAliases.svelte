<script>
    import { mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';
    import { matchesSite } from '../lib/site.js';
    import { copyWithFeedback, fillWithFeedback } from '../lib/feedback.js';

    /**
     * @type {{
     *   aliases: import('../services/mailcow.service.js').Alias[],
     *   site: import('../lib/site.js').Site | null,
     *   highlight: string, tabId: number | null, canFill: boolean, loading: boolean,
     * }}
     */
    let { aliases = $bindable(), site, highlight, tabId, canFill, loading } = $props();

    /** Alias ids with a request in flight. */
    let busy = $state(new Set());
    /** Alias waiting for the delete confirmation click. */
    let confirmingId = $state('');
    let confirmTimer;

    const visible = $derived(aliases
        .filter(alias => alias.address === highlight || (site && matchesSite(alias, site)))
        .sort((a, b) => Number(b.address === highlight) - Number(a.address === highlight)
            || Number(b.active) - Number(a.active)
            || a.address.localeCompare(b.address)));

    async function run(alias, action) {
        busy = new Set(busy).add(alias.id);
        try {
            await action();
        } catch (error) {
            notifications.error(error.message);
        } finally {
            busy.delete(alias.id);
            busy = new Set(busy);
        }
    }

    function toggle(alias) {
        const active = !alias.active;
        return run(alias, async () => {
            await mailcowService.setAliasActive(alias.id, active);
            aliases = aliases.map(a => (a.id === alias.id ? { ...a, active } : a));
            notifications.success(`${alias.address} ${active ? 'réactivé' : 'désactivé'}`);
        });
    }

    function remove(alias) {
        // Two clicks: a deleted alias can't be restored, mails to it bounce.
        if (confirmingId !== alias.id) {
            confirmingId = alias.id;
            clearTimeout(confirmTimer);
            confirmTimer = setTimeout(() => (confirmingId = ''), 3000);
            return;
        }
        confirmingId = '';
        return run(alias, async () => {
            await mailcowService.deleteAlias(alias.id);
            aliases = aliases.filter(a => a.id !== alias.id);
            notifications.success(`${alias.address} supprimé`);
        });
    }
</script>

{#if visible.length > 0 || loading}
    <section class="mt-5" aria-label="Alias existants">
        <h2 class="mb-2 flex items-center gap-2 text-xs font-semibold">
            {site ? `Déjà créés pour ${site.host}` : 'Alias créé'}
            {#if loading}<span class="loading loading-spinner loading-xs"></span>{/if}
        </h2>
        <ul class="space-y-1">
            {#each visible as alias (alias.id)}
                <li
                    class="flex items-center gap-1 rounded-box bg-base-200 py-1 pr-1 pl-3"
                    class:ring-2={alias.address === highlight}
                    class:ring-success={alias.address === highlight}
                >
                    <span
                        class="min-w-0 flex-1 truncate font-mono text-xs"
                        class:line-through={!alias.active}
                        class:opacity-50={!alias.active}
                        title={alias.comment ? `${alias.address}\n${alias.comment}` : alias.address}
                    >{alias.address}</span>

                    {#if busy.has(alias.id)}
                        <span class="loading loading-spinner loading-xs mx-2"></span>
                    {:else}
                        {#if canFill && alias.active}
                            <button class="btn btn-ghost btn-xs btn-square" onclick={() => fillWithFeedback(tabId, alias.address)}
                                aria-label="Remplir la page avec {alias.address}" title="Remplir la page">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 18l1.464-4.536z" />
                                    <path stroke-linecap="round" d="M4 21h16" />
                                </svg>
                            </button>
                        {/if}
                        <button class="btn btn-ghost btn-xs btn-square" onclick={() => copyWithFeedback(alias.address)}
                            aria-label="Copier {alias.address}" title="Copier">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <input
                            type="checkbox"
                            class="toggle toggle-xs toggle-success mx-1"
                            checked={alias.active}
                            onchange={(e) => { e.currentTarget.checked = alias.active; toggle(alias); }}
                            aria-label="{alias.active ? 'Désactiver' : 'Réactiver'} {alias.address}"
                            title={alias.active ? 'Actif : cliquer pour désactiver' : 'Désactivé : cliquer pour réactiver'}
                        />
                        {#if confirmingId === alias.id}
                            <button class="btn btn-error btn-xs" onclick={() => remove(alias)}>Supprimer ?</button>
                        {:else}
                            <button class="btn btn-ghost btn-xs btn-square" onclick={() => remove(alias)}
                                aria-label="Supprimer {alias.address}" title="Supprimer">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        {/if}
                    {/if}
                </li>
            {/each}
        </ul>
    </section>
{/if}
