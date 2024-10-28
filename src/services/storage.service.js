// Service de stockage qui s'adapte à l'environnement
class StorageService {
    constructor() {
        this.storage = chrome?.storage?.local || this.createLocalStorageFallback();
    }

    createLocalStorageFallback() {
        return {
            get: async (keys) => {
                const result = {};
                for (const key of Array.isArray(keys) ? keys : [keys]) {
                    result[key] = localStorage.getItem(key);
                    try {
                        result[key] = JSON.parse(result[key]);
                    } catch {
                        // Si ce n'est pas du JSON, on garde la valeur telle quelle
                    }
                }
                return result;
            },
            set: async (items) => {
                for (const [key, value] of Object.entries(items)) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            },
            clear: async () => {
                localStorage.clear();
            }
        };
    }

    async get(keys) {
        try {
            return await this.storage.get(keys);
        } catch (error) {
            console.error('Error getting storage:', error);
            return {};
        }
    }

    async set(items) {
        try {
            await this.storage.set(items);
        } catch (error) {
            console.error('Error setting storage:', error);
        }
    }

    async clear() {
        try {
            await this.storage.clear();
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }
}

export const storageService = new StorageService();
