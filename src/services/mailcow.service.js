import { getCredentials } from './settings.service.js';
import { storageService } from './storage.service.js';

const TIMEOUT_MS = 10000;

// Known Mailcow message keys, see data/web/lang/lang.en-gb.json in mailcow.
const MESSAGES = {
    is_alias_or_mailbox: (address) => `${address} existe déjà (alias ou boîte mail)`,
    is_alias: (address) => `${address} existe déjà`,
    alias_invalid: (address) => `Adresse invalide : ${address}`,
    goto_invalid: (address) => `Destination invalide : ${address}`,
    access_denied: () => 'Accès refusé : la clé API est-elle en lecture/écriture ?',
};

export class MailcowError extends Error {}

function describe(msg) {
    const [key, ...args] = [msg].flat().map(String);
    return MESSAGES[key]?.(...args) ?? `Mailcow : ${[key, ...args].join(' ')}`;
}

/**
 * @param {string} endpoint
 * @param {{ method?: string, body?: object }} [options]
 */
async function request(endpoint, { method = 'GET', body } = {}) {
    const { mailcowUrl, apiKey } = getCredentials();

    let response;
    try {
        response = await fetch(`${mailcowUrl}/api/v1/${endpoint}`, {
            method,
            headers: {
                'X-API-Key': apiKey,
                ...(body && { 'Content-Type': 'application/json' }),
            },
            body: body && JSON.stringify(body),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        throw new MailcowError(error.name === 'TimeoutError'
            ? 'Le serveur Mailcow ne répond pas'
            : 'Serveur injoignable : vérifie l\'URL et l\'autorisation d\'accès');
    }

    if (response.status === 401 || response.status === 403) {
        throw new MailcowError('Clé API refusée (clé invalide ou IP non autorisée)');
    }
    if (!response.ok) {
        throw new MailcowError(`Erreur du serveur Mailcow (HTTP ${response.status})`);
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new MailcowError('Réponse inattendue : est-ce bien un serveur Mailcow ?');
    }

    // Mailcow reports failed actions with HTTP 200 and a "danger"/"error" entry.
    const failure = [data].flat().find(entry =>
        entry && 'msg' in entry && (entry.type === 'danger' || entry.type === 'error'));
    if (failure) throw new MailcowError(describe(failure.msg));

    return data;
}

// Mailboxes can be "active: 2" (receive only), still a valid alias target.
const isActive = (item) => Number(item.active) !== 0;
const sorted = (values) => values.sort((a, b) => a.localeCompare(b));

export const mailcowService = {
    async loadLists() {
        const { mailcowUrl } = getCredentials();
        const [domainData, mailboxData] = await Promise.all([
            request('get/domain/all'),
            request('get/mailbox/all'),
        ]);

        const lists = {
            domains: sorted([domainData].flat().filter(isActive).map(d => d.domain_name).filter(Boolean)),
            mailboxes: sorted([mailboxData].flat().filter(isActive).map(m => m.username).filter(Boolean)),
        };
        await storageService.set({ listCache: { mailcowUrl, ...lists } });
        return lists;
    },

    /** Last lists fetched from the configured server, to render the popup instantly. */
    async getCachedLists() {
        const { mailcowUrl } = getCredentials();
        const { listCache } = await storageService.get(['listCache']);
        return listCache?.mailcowUrl === mailcowUrl ? listCache : null;
    },

    /**
     * @param {string} address
     * @param {string} goto
     */
    createAlias(address, goto) {
        return request('add/alias', {
            method: 'POST',
            body: { address, goto, active: 1 },
        });
    },
};
