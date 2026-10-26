import { ext } from '../lib/browser.js';

// localStorage fallback keeps the popup usable on the vite dev server.
const localStorageArea = {
    async get(keys) {
        const result = {};
        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (raw !== null) result[key] = JSON.parse(raw);
        }
        return result;
    },
    async set(items) {
        for (const [key, value] of Object.entries(items)) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    },
};

const area = ext?.storage?.local ?? localStorageArea;

export const storageService = {
    /** @param {string[]} keys */
    get: (keys) => area.get(keys),
    /** @param {Record<string, unknown>} items */
    set: (items) => area.set(items),
};
