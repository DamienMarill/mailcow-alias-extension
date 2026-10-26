<script>
    import { onMount } from 'svelte';
    import { settings } from '../services/settings.service.js';
    import { mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';
    import { copyText, fillEmailFieldsInTab } from '../lib/browser.js';
    import { sanitizeLocalPart } from '../lib/url.js';
    import { addRandomSuffix } from '../lib/suffix.js';
    import { siteComment } from '../lib/site.js';
    import { pickOption } from '../lib/pick.js';
    import { fieldsLabel } from '../lib/feedback.js';

    /**
     * @type {{
     *   domains: string[], mailboxes: string[], refreshing: boolean,
     *   tabId: number | null, site: import('../lib/site.js').Site | null,
     *   onCreated: (address: string) => void,
     * }}
     */
    let { domains, mailboxes, refreshing, tabId, site, onCreated } = $props();

    let localPart = $state('');
    let domain = $state('');
    let mailbox = $state('');
    let isSubmitting = $state(false);
    /** Email fields detected on the page, filled along with the creation. */
    let fieldCount = $state(0);
    let lastSuffix = '';
    /** @type {HTMLInputElement} */
    let aliasInput;

    const address = $derived(`${sanitizeLocalPart(localPart)}@${domain}`);
    const canSubmit = $derived(!!sanitizeLocalPart(localPart) && !!domain && !!mailbox && !isSubmitting);
    const canFill = $derived(tabId !== null && $settings.autofillEnabled);

    // Keeps a valid selection, preferring the current then the last one used.
    $effect(() => {
        domain = pickOption(domains, domain, $settings.lastDomain);
    });
    $effect(() => {
        mailbox = pickOption(mailboxes, mailbox, $settings.lastMailbox);
    });

    function rollSuffix() {
        ({ value: localPart, suffix: lastSuffix } = addRandomSuffix(localPart.trim(), $settings.suffixSeparator, lastSuffix));
        aliasInput.focus();
    }

    onMount(async () => {
        if (site) {
            localPart = site.name;
            if ($settings.suffixEnabled) rollSuffix();
        }
        // Selected so the user can either confirm with Enter or type over it.
        aliasInput.focus();
        aliasInput.select();

        if (canFill) fieldCount = await fillEmailFieldsInTab(tabId, '', { dryRun: true });
    });

    async function handleSubmit(event) {
        event.preventDefault();
        if (!canSubmit) return;

        isSubmitting = true;
        const created = address;
        try {
            await mailcowService.createAlias(created, mailbox, { comment: site ? siteComment(site) : '' });
            settings.save({ lastDomain: domain, lastMailbox: mailbox }).catch(() => {});
            localPart = '';
            lastSuffix = '';

            const filled = canFill ? await fillEmailFieldsInTab(tabId, created) : 0;
            const copied = await copyText(created);
            const done = [filled && `rempli dans ${fieldsLabel(filled)}`, copied && 'copié'].filter(Boolean);
            notifications.success(done.length === 2
                ? `Alias créé, ${done.join(' et ')} !`
                : `Alias créé${done.length ? ` et ${done[0]}` : ''} !${copied ? '' : ' (copie impossible, utilise le bouton)'}`);
            onCreated(created);
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
