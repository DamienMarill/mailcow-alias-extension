<script>
    import { settings, isConfigured } from '../services/settings.service.js';
    import { mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';
    import { requestOriginAccess } from '../lib/browser.js';
    import { normalizeServerUrl } from '../lib/url.js';

    let { onDone } = $props();

    let mailcowUrl = $state($settings.mailcowUrl);
    let apiKey = $state($settings.apiKey);
    let showKey = $state(false);
    let isSaving = $state(false);

    const isFirstRun = !$isConfigured;
    const isInsecure = $derived(/^http:\/\//i.test(mailcowUrl.trim()));

    function handleSubmit(event) {
        event.preventDefault();
        const url = normalizeServerUrl(mailcowUrl);
        if (!url) {
            notifications.error('URL invalide');
            return;
        }
        mailcowUrl = url;

        // Both calls start synchronously: permissions.request() needs the click
        // gesture, and Firefox may close the popup while its prompt is shown.
        const saved = settings.save({ mailcowUrl: url, apiKey: apiKey.trim() });
        const granted = requestOriginAccess(url);
        finishSave(saved, granted);
    }

    async function finishSave(saved, granted) {
        isSaving = true;
        try {
            await saved;
            if (!(await granted)) {
                notifications.error('Sans autorisation d\'accès au serveur, l\'extension ne peut rien faire');
                return;
            }
            const { domains } = await mailcowService.loadLists();
            notifications.success(`Connecté : ${domains.length} domaine(s) trouvé(s)`);
            onDone();
        } catch (error) {
            notifications.error(error.message);
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="p-4">
    {#if isFirstRun}
        <p class="mb-4 text-sm">
            Bienvenue ! Renseigne ton serveur Mailcow pour créer des alias en un clic.
        </p>
    {/if}

    <form onsubmit={handleSubmit} class="space-y-3">
        <label class="form-control">
            <div class="label pt-0">
                <span class="label-text">URL Mailcow</span>
            </div>
            <input
                type="text"
                inputmode="url"
                bind:value={mailcowUrl}
                placeholder="mail.example.com"
                class="input input-bordered w-full"
                autocomplete="url"
                spellcheck="false"
                required
            />
            {#if isInsecure}
                <div class="label">
                    <span class="label-text-alt text-warning">HTTP non chiffré : ta clé API circulera en clair.</span>
                </div>
            {/if}
        </label>

        <label class="form-control">
            <div class="label pt-0">
                <span class="label-text">Clé API</span>
            </div>
            <div class="join w-full">
                <input
                    type={showKey ? 'text' : 'password'}
                    bind:value={apiKey}
                    placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                    class="input input-bordered join-item min-w-0 flex-1 font-mono"
                    autocomplete="off"
                    spellcheck="false"
                    required
                />
                <button
                    type="button"
                    class="btn join-item"
                    onclick={() => (showKey = !showKey)}
                    aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                    {showKey ? 'Masquer' : 'Afficher'}
                </button>
            </div>
            <div class="label">
                <span class="label-text-alt">
                    Clé <strong>lecture/écriture</strong> : Mailcow → Système → Configuration → Accès → API.
                </span>
            </div>
        </label>

        <button class="btn btn-primary w-full" disabled={isSaving}>
            {#if isSaving}
                <span class="loading loading-spinner loading-sm"></span>
            {/if}
            Enregistrer et tester
        </button>
    </form>
</div>
