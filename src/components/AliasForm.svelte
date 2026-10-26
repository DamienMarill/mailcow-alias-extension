<script>
    import { onMount } from 'svelte';
    import { settings } from '../services/settings.service.js';
    import { mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';
    import { copyText, fillEmailFieldsInTab, getActiveTab } from '../lib/browser.js';
    import { aliasFromUrl, sanitizeLocalPart } from '../lib/url.js';
    import { addRandomSuffix } from '../lib/suffix.js';

    /** @type {{ domains: string[], mailboxes: string[], refreshing: boolean }} */
    let { domains, mailboxes, refreshing } = $props();

    let localPart = $state('');
    let domain = $state('');
    let mailbox = $state('');
    let isSubmitting = $state(false);
    let lastCreated = $state('');
    let justCopied = $state(false);
    /** Email fields detected on the page, filled along with the creation. */
    let fieldCount = $state(0);
    let tabId = $state(null);
    let lastSuffix = '';
    /** @type {HTMLInputElement} */
    let aliasInput;

    const address = $derived(`${sanitizeLocalPart(localPart)}@${domain}`);
    const canSubmit = $derived(!!sanitizeLocalPart(localPart) && !!domain && !!mailbox && !isSubmitting);
    const canFill = $derived(tabId !== null && $settings.autofillEnabled);

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

    function rollSuffix() {
        ({ value: localPart, suffix: lastSuffix } = addRandomSuffix(localPart.trim(), $settings.suffixSeparator, lastSuffix));
        aliasInput.focus();
    }

    onMount(async () => {
        const tab = await getActiveTab();
        tabId = tab?.id ?? null;

        const suggestion = aliasFromUrl(tab?.url ?? '');
        if (!localPart && suggestion) {
            localPart = suggestion;
            if ($settings.suffixEnabled) rollSuffix();
        }
        // Selected so the user can either confirm with Enter or type over it.
        aliasInput.focus();
        aliasInput.select();

        if (canFill) fieldCount = await fillEmailFieldsInTab(tabId, '', { dryRun: true });
    });

    async function copy(text) {
        justCopied = await copyText(text);
        if (justCopied) setTimeout(() => (justCopied = false), 1500);
        return justCopied;
    }

    const fieldsLabel = (count) => `${count} champ${count > 1 ? 's' : ''}`;

    async function fill(text) {
        const filled = await fillEmailFieldsInTab(tabId, text);
        if (filled) notifications.success(`Rempli dans ${fieldsLabel(filled)} de la page`);
        else notifications.add('Aucun champ email trouvé sur la page', 'warning');
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
            lastSuffix = '';

            const filled = canFill ? await fillEmailFieldsInTab(tabId, created) : 0;
            const copied = await copy(created);
            const done = [filled && `rempli dans ${fieldsLabel(filled)}`, copied && 'copié'].filter(Boolean);
            notifications.success(done.length === 2
                ? `Alias créé, ${done.join(' et ')} !`
                : `Alias créé${done.length ? ` et ${done[0]}` : ''} !${copied ? '' : ' (copie impossible, utilise le bouton)'}`);
        } catch (error) {
            notifications.error(error.message);
        } finally {
            isSubmitting = false;
            aliasInput.focus();
        }
    }
</script>

<form onsubmit={handleSubmit}>
    <fieldset class="fieldset">
        <legend class="fieldset-legend">
            Alias
            {#if refreshing}
                <span class="loading loading-spinner loading-xs" title="Actualisation…"></span>
            {/if}
        </legend>
        <div class="join w-full">
            <label class="input join-item min-w-0 flex-1 pr-1">
                <input
                    bind:this={aliasInput}
                    bind:value={localPart}
                    type="text"
                    placeholder="nom-du-site"
                    class="min-w-0 grow"
                    aria-label="Alias"
                    autocomplete="off"
                    spellcheck="false"
                    required
                />
                <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square"
                    onclick={rollSuffix}
                    aria-label="Ajouter un suffixe aléatoire"
                    title="Suffixe aléatoire"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <rect x="4" y="4" width="16" height="16" rx="3" />
                        <circle cx="9" cy="9" r="1" fill="currentColor" />
                        <circle cx="15" cy="15" r="1" fill="currentColor" />
                        <circle cx="15" cy="9" r="1" fill="currentColor" />
                        <circle cx="9" cy="15" r="1" fill="currentColor" />
                    </svg>
                </button>
            </label>
            <span class="join-item flex items-center border border-base-content/20 bg-base-200 px-2">@</span>
            <select bind:value={domain} class="select join-item w-auto min-w-0 max-w-[45%]" aria-label="Domaine">
                {#each domains as option (option)}
                    <option value={option}>{option}</option>
                {/each}
            </select>
        </div>
    </fieldset>

    <fieldset class="fieldset">
        <legend class="fieldset-legend">Redirigé vers</legend>
        <select bind:value={mailbox} class="select w-full" aria-label="Boîte de destination">
            {#each mailboxes as option (option)}
                <option value={option}>{option}</option>
            {/each}
        </select>
    </fieldset>

    <button type="submit" class="btn btn-primary mt-3 w-full" disabled={!canSubmit}>
        {#if isSubmitting}
            <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Créer l'alias
    </button>
    {#if canFill && fieldCount > 0}
        <p class="mt-2 text-center text-xs opacity-70">
            Sera aussi rempli dans {fieldsLabel(fieldCount)} de la page.
        </p>
    {/if}
</form>

{#if lastCreated}
    <div class="mt-4 flex items-center justify-between gap-1 rounded-box bg-base-200 p-2 pl-3">
        <span class="truncate font-mono text-sm" title={lastCreated}>{lastCreated}</span>
        <div class="flex shrink-0">
            {#if canFill}
                <button
                    class="btn btn-ghost btn-sm btn-square"
                    onclick={() => fill(lastCreated)}
                    aria-label="Remplir les champs email de la page"
                    title="Remplir la page"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 18l1.464-4.536z" />
                        <path stroke-linecap="round" d="M4 21h16" />
                    </svg>
                </button>
            {/if}
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
    </div>
{/if}
