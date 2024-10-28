<script>
    import { settings } from '../services/settings.service.js';
    import { notifications } from '../services/notification.service.js';

    let mailcowUrl = $settings.mailcowUrl;
    let apiKey = $settings.apiKey;
    let isSaving = false;

    async function saveSettings() {
        isSaving = true;
        try {
            await settings.setMailcowUrl(mailcowUrl);
            await settings.setApiKey(apiKey);
            notifications.add('Paramètres sauvegardés avec succès !', 'success');
        } catch (error) {
            notifications.add('Erreur lors de la sauvegarde', 'error');
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="p-4">
    <h2 class="text-xl font-bold mb-4">Paramètres</h2>

    <form on:submit|preventDefault={saveSettings}>
        <div class="form-control">
            <label class="label">
                <span class="label-text">URL Mailcow</span>
            </label>
            <input
                    type="url"
                    bind:value={mailcowUrl}
                    placeholder="https://mail.example.com"
                    class="input input-bordered w-full"
                    required
            />
        </div>

        <div class="form-control mt-4">
            <label class="label">
                <span class="label-text">API Key</span>
            </label>
            <input
                    type="password"
                    bind:value={apiKey}
                    placeholder="Votre API key"
                    class="input input-bordered w-full"
                    required
            />
        </div>

        <button class="btn btn-primary mt-6 w-full" disabled={isSaving}>
            {#if isSaving}
                <span class="loading loading-spinner loading-sm"></span>
            {/if}
            Sauvegarder
        </button>
    </form>
</div>
