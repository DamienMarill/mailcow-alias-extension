import { writable, derived, get } from 'svelte/store';
import { storageService } from './storage.service.js';

const DEFAULTS = {
    mailcowUrl: '',
    apiKey: '',
    // Remembered between popups so the usual choice is preselected.
    lastDomain: '',
    lastMailbox: '',
};

const KEYS = Object.keys(DEFAULTS);

const createSettingsStore = () => {
    const { subscribe, set, update } = writable({ ...DEFAULTS });

    return {
        subscribe,
        async init() {
            const data = await storageService.get(KEYS);
            set({ ...DEFAULTS, ...data });
        },
        /**
         * The storage write starts synchronously, so this can be called
         * right before permissions.request() in a click handler.
         * @param {Partial<typeof DEFAULTS>} values
         */
        save(values) {
            update(s => ({ ...s, ...values }));
            return storageService.set(values);
        },
    };
};

export const settings = createSettingsStore();

export const isConfigured = derived(
    settings,
    $settings => !!$settings.mailcowUrl && !!$settings.apiKey
);

export function getCredentials() {
    const { mailcowUrl, apiKey } = get(settings);
    if (!mailcowUrl || !apiKey) {
        throw new Error('Configuration manquante');
    }
    return { mailcowUrl, apiKey };
}
