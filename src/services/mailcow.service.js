import { getCredentials } from './settings.service.js';
import { storageService } from './storage.service.js';

const TIMEOUT_MS = 10000;
// Lists fetched more recently than this are not refreshed when the popup opens.
const CACHE_FRESH_MS = 60 * 1000;

// Known Mailcow message keys, see data/web/lang/lang.en-gb.json in mailcow.
const MESSAGES = {
    is_alias_or_mailbox: (address) => `${address} existe déjà (alias ou boîte mail)`,
    is_alias: (address) => `${address} existe déjà`,
    alias_invalid: (address) => `Adresse invalide : ${address}`,
    goto_invalid: (address) => `Destination invalide : ${address}`,
    access_denied: () => 'Accès refusé : la clé API est-elle en lecture/écriture ?',
};

// Mailcow limits comments to 160 characters.
const COMMENT_MAX_LENGTH = 160;

export class MailcowError extends Error {
    /**
     * @param {string} message
     * @param {string} [code] Mailcow message key, e.g. "is_alias_or_mailbox"
     */
    constructor(message, code) {
        super(message);
        this.code = code;
    }

    get isAlreadyTaken() {
        return this.code === 'is_alias_or_mailbox' || this.code === 'is_alias';
    }
}

function toError(msg) {
    const [key, ...args] = [msg].flat().map(String);
    return new MailcowError(MESSAGES[key]?.(...args) ?? `Mailcow : ${[key, ...args].join(' ')}`, key);
}

/**
 * @param {string} endpoint
 * @param {{ method?: string, body?: object | string[] }} [options]
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
    if (failure) throw toError(failure.msg);

    return data;
}

// Mailboxes can be "active: 2" (receive only), still a valid alias target.
const isActive = (item) => Number(item.active) !== 0;
const sorted = (values) => values.sort((a, b) => a.localeCompare(b));

/**
 * @typedef {{ id: string, address: string, goto: string, active: boolean, comment: string }} Alias
 * @returns {Alias}
 */
const toAlias = (item) => ({
    id: String(item.id),
    address: item.address,
    goto: item.goto ?? '',
    active: Number(item.active_int ?? item.active) === 1,
    comment: item.private_comment ?? '',
});

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
        await storageService.set({ listCache: { mailcowUrl, fetchedAt: Date.now(), ...lists } });
        return lists;
    },

    /** Last lists fetched from the configured server, to render the popup instantly. */
    async getCachedLists() {
        const { mailcowUrl } = getCredentials();
        const { listCache } = await storageService.get(['listCache']);
        if (listCache?.mailcowUrl !== mailcowUrl) return null;
        return { ...listCache, isFresh: Date.now() - (listCache.fetchedAt ?? 0) < CACHE_FRESH_MS };
    },

    /** @returns {Promise<Alias[]>} every alias of the server, catch-alls excluded */
    async listAliases() {
        const data = await request('get/alias/all');
        return [data].flat()
            .filter(item => item?.address && Number(item.is_catch_all) !== 1)
            .map(toAlias);
    },

    /**
     * @param {string} address
     * @param {string} goto
     * @param {{ comment?: string }} [options] comment: private note shown in Mailcow
     */
    createAlias(address, goto, { comment = '' } = {}) {
        return request('add/alias', {
            method: 'POST',
            body: {
                address,
                goto,
                active: 1,
                ...(comment && { private_comment: comment.slice(0, COMMENT_MAX_LENGTH) }),
            },
        });
    },

    /**
     * @param {string} id
     * @param {boolean} active
     */
    setAliasActive(id, active) {
        return request('edit/alias', {
            method: 'POST',
            body: { items: [id], attr: { active: active ? '1' : '0' } },
        });
    },

    /** @param {string} id */
    deleteAlias(id) {
        return request('delete/alias', { method: 'POST', body: [id] });
    },
};
