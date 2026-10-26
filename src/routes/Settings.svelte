<script>
    import { settings, isConfigured } from '../services/settings.service.js';
    import { mailcowService } from '../services/mailcow.service.js';
    import { notifications } from '../services/notification.service.js';
    import { requestOriginAccess } from '../lib/browser.js';
    import { normalizeServerUrl } from '../lib/url.js';
    import { SEPARATORS } from '../lib/suffix.js';

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

    /** Preferences are applied as soon as they change. */
    function savePreference(values) {
        settings.save(values).catch(() => notifications.error('Impossible d\'enregistrer la préférence'));
    }
</script>

<div class="p-4">
    {#if isFirstRun}
        <p class="mb-2 text-sm">
            Bienvenue ! Renseigne ton serveur Mailcow pour créer des alias en un clic.
        </p>
    {/if}

    <form onsubmit={handleSubmit}>
        <fieldset class="fieldset">
            <legend class="fieldset-legend">URL Mailcow</legend>
            <input
                type="text"
                inputmode="url"
                bind:value={mailcowUrl}
                placeholder="mail.example.com"
                class="input w-full"
                aria-label="URL Mailcow"
                autocomplete="url"
                spellcheck="false"
                required
            />
            {#if isInsecure}
                <p class="label text-warning">HTTP non chiffré : ta clé API circulera en clair.</p>
            {/if}
        </fieldset>

        <fieldset class="fieldset">
            <legend class="fieldset-legend">Clé API</legend>
            <div class="join w-full">
                <input
                    type={showKey ? 'text' : 'password'}
                    bind:value={apiKey}
                    placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                    class="input join-item min-w-0 flex-1 font-mono"
                    aria-label="Clé API"
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
            <p class="label whitespace-normal">
                Clé lecture/écriture : Mailcow → Système → Configuration → Accès → API.
            </p>
        </fieldset>

        <button class="btn btn-primary mt-3 w-full" disabled={isSaving}>
            {#if isSaving}
                <span class="loading loading-spinner loading-sm"></span>
            {/if}
            Enregistrer et tester
        </button>
    </form>

    {#if !isFirstRun}
        <fieldset class="fieldset mt-4 rounded-box border border-base-300 p-3">
            <legend class="fieldset-legend">Préférences</legend>

            <label class="label cursor-pointer justify-between whitespace-normal text-base-content">
                Remplir les champs email de la page
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={$settings.autofillEnabled}
                    onchange={(e) => savePreference({ autofillEnabled: e.currentTarget.checked })}
                />
            </label>

            <label class="label mt-2 cursor-pointer justify-between whitespace-normal text-base-content">
                Ajouter un suffixe aléatoire
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={$settings.suffixEnabled}
                    onchange={(e) => savePreference({ suffixEnabled: e.currentTarget.checked })}
                />
            </label>
            <div class="mt-1 flex items-center justify-between gap-2">
                <span class="text-xs opacity-70">
                    Séparateur : amazon<strong>{$settings.suffixSeparator}</strong>k3x9q
                </span>
                <select
                    class="select select-sm w-20"
                    value={$settings.suffixSeparator}
                    onchange={(e) => savePreference({ suffixSeparator: e.currentTarget.value })}
                    aria-label="Séparateur du suffixe"
                >
                    {#each SEPARATORS as separator (separator)}
                        <option value={separator}>{separator}</option>
                    {/each}
                </select>
            </div>
            <p class="label mt-1 whitespace-normal">
                Un suffixe rend l'alias impossible à deviner pour un spammeur. Le bouton dé l'ajoute à la demande.
            </p>
        </fieldset>
    {/if}
</div>
