<script>
    import { onMount } from 'svelte';
    import { settings } from '../services/settings.service.js';
    import { mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';
    import { copyText, getActiveTabUrl } from '../lib/browser.js';
    import { aliasFromUrl, sanitizeLocalPart } from '../lib/url.js';

    /** @type {{ domains: string[], mailboxes: string[], refreshing: boolean }} */
    let { domains, mailboxes, refreshing } = $props();

    let localPart = $state('');
    let domain = $state('');
    let mailbox = $state('');
    let isSubmitting = $state(false);
    let lastCreated = $state('');
    let justCopied = $state(false);
    /** @type {HTMLInputElement} */
    let aliasInput;

    const address = $derived(`${sanitizeLocalPart(localPart)}@${domain}`);
    const canSubmit = $derived(!!sanitizeLocalPart(localPart) && !!domain && !!mailbox && !isSubmitting);

    /** Keeps a valid selection, preferring the last one used. */
    function pick(current, options, remembered) {
        if (options.includes(current)) return current;
        if (options.includes(remembered)) return remembered;
        return options[0] ?? '';
    }

    $effect(() => {
        domain = pick(domain, domains, $settings.lastDomain);
    });
    $effect(() => {
        mailbox = pick(mailbox, mailboxes, $settings.lastMailbox);
    });

    onMount(async () => {
        const suggestion = aliasFromUrl(await getActiveTabUrl());
        if (!localPart) localPart = suggestion;
        // Selected so the user can either confirm with Enter or type over it.
        aliasInput.focus();
        aliasInput.select();
    });

    async function copy(text) {
        justCopied = await copyText(text);
        if (justCopied) setTimeout(() => (justCopied = false), 1500);
        return justCopied;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!canSubmit) return;

        isSubmitting = true;
        const created = address;
        try {
            await mailcowService.createAlias(created, mailbox);
            settings.save({ lastDomain: domain, lastMailbox: mailbox }).catch(() => {});
            lastCreated = created;
            localPart = '';
            notifications.success(await copy(created)
                ? 'Alias créé et copié dans le presse-papier !'
                : 'Alias créé (copie impossible, utilise le bouton)');
        } catch (error) {
            notifications.error(error.message);
        } finally {
            isSubmitting = false;
            aliasInput.focus();
        }
    }
</script>

<form onsubmit={handleSubmit} class="space-y-3">
    <label class="form-control">
        <div class="label pt-0">
            <span class="label-text">Alias</span>
            {#if refreshing}
                <span class="label-text-alt loading loading-spinner loading-xs" title="Actualisation…"></span>
            {/if}
        </div>
        <div class="join w-full">
            <input
                bind:this={aliasInput}
                bind:value={localPart}
                type="text"
                placeholder="nom-du-site"
                class="input input-bordered join-item min-w-0 flex-1"
                autocomplete="off"
                spellcheck="false"
                required
            />
            <span class="join-item flex items-center border border-base-content/20 bg-base-200 px-2">@</span>
            <select bind:value={domain} class="select select-bordered join-item min-w-0 max-w-[50%]" aria-label="Domaine">
                {#each domains as option (option)}
                    <option value={option}>{option}</option>
                {/each}
            </select>
        </div>
    </label>

    <label class="form-control">
        <div class="label pt-0">
            <span class="label-text">Redirigé vers</span>
        </div>
        <select bind:value={mailbox} class="select select-bordered w-full">
            {#each mailboxes as option (option)}
                <option value={option}>{option}</option>
            {/each}
        </select>
    </label>

    <button type="submit" class="btn btn-primary w-full" disabled={!canSubmit}>
        {#if isSubmitting}
            <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Créer l'alias
    </button>
</form>

{#if lastCreated}
    <div class="mt-4 flex items-center justify-between gap-2 rounded-lg bg-base-200 p-3">
        <span class="truncate font-mono text-sm" title={lastCreated}>{lastCreated}</span>
        <button
            class="btn btn-ghost btn-sm btn-square"
            onclick={() => copy(lastCreated)}
            aria-label="Copier l'alias"
            title="Copier"
        >
            {#if justCopied}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            {/if}
        </button>
    </div>
{/if}
