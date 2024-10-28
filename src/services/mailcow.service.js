import { writable, derived, get } from 'svelte/store'; // Ajout de get ici
import { settings, getCredentials } from './settings.service.js';
import { notifications } from './notification.service.js';

export const domains = writable([]);
export const mailboxes = writable([]);

class MailcowService {
    constructor() {
        settings.subscribe(($settings) => {
            if (!$settings.mailcowUrl || !$settings.apiKey) {
                domains.set([]);
                mailboxes.set([]);
            }
        });
    }

    async fetchWithAuth(endpoint, options = {}) {
        try {
            const { mailcowUrl, apiKey } = getCredentials();

            const response = await fetch(`${mailcowUrl}/api/v1/${endpoint}`, {
                ...options,
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur API: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async loadDomains() {
        try {
            const data = await this.fetchWithAuth('get/domain/all');
            if (Array.isArray(data)) {
                domains.set(data.map(d => d.domain_name));
            } else {
                console.error('Invalid domains data:', data);
                domains.set([]);
            }
        } catch (error) {
            notifications.add('Erreur lors du chargement des domaines', 'error');
            console.error('Error loading domains:', error);
            domains.set([]);
        }
    }

    async loadMailboxes() {
        try {
            const data = await this.fetchWithAuth('get/mailbox/all');
            if (Array.isArray(data)) {
                mailboxes.set(data.map(m => m.username));
            } else {
                console.error('Invalid mailboxes data:', data);
                mailboxes.set([]);
            }
        } catch (error) {
            notifications.add('Erreur lors du chargement des boîtes mail', 'error');
            console.error('Error loading mailboxes:', error);
            mailboxes.set([]);
        }
    }

    async createAlias(alias, domain, target) {
        try {
            const response = await this.fetchWithAuth('add/alias', {
                method: 'POST',
                body: JSON.stringify({
                    address: `${alias}@${domain}`,
                    goto: target,
                    active: 1
                })
            });

            notifications.add('Alias créé avec succès !', 'success');
            return response;
        } catch (error) {
            notifications.add('Erreur lors de la création de l\'alias', 'error');
            throw error;
        }
    }
}

export const mailcowService = new MailcowService();
