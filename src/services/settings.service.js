import {writable, derived, get} from 'svelte/store';
import { storageService } from './storage.service.js';

// Stores pour les settings
const createSettingsStore = () => {
    const { subscribe, set, update } = writable({
        mailcowUrl: '',
        apiKey: ''
    });

    return {
        subscribe,
        async init() {
            const data = await storageService.get(['mailcowUrl', 'apiKey']);
            set({
                mailcowUrl: data.mailcowUrl || '',
                apiKey: data.apiKey || ''
            });
        },
        async setMailcowUrl(url) {
            await storageService.set({ mailcowUrl: url });
            update(s => ({ ...s, mailcowUrl: url }));
        },
        async setApiKey(key) {
            await storageService.set({ apiKey: key });
            update(s => ({ ...s, apiKey: key }));
        },
        async clear() {
            await storageService.clear();
            set({ mailcowUrl: '', apiKey: '' });
        }
    };
};

export const settings = createSettingsStore();

export const isConfigured = derived(
    settings,
    $settings => !!$settings.mailcowUrl && !!$settings.apiKey
);

export function getCredentials() {
    const currentSettings = get(settings);
    if (!currentSettings.mailcowUrl || !currentSettings.apiKey) {
        throw new Error('Configuration manquante');
    }
    return currentSettings;
}
