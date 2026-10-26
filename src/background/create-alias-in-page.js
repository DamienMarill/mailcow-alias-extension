import { get } from 'svelte/store';
import { settings, isConfigured } from '../services/settings.service.js';
import { MailcowError, mailcowService } from '../services/mailcow.service.js';
import { copyText, fillEmailFieldsInTab, hasOriginAccess, showToastInTab } from '../lib/browser.js';
import { getSite, siteComment } from '../lib/site.js';
import { addRandomSuffix } from '../lib/suffix.js';
import { pickOption } from '../lib/pick.js';

/**
 * Context menu flow: creates an alias for the page with the usual choices
 * (last domain and mailbox, suffix preference) and fills the clicked field.
 * @param {number} tabId
 * @param {string} pageUrl
 * @param {number} frameId frame of the right-clicked field
 */
export async function createAliasInPage(tabId, pageUrl, frameId) {
    try {
        await settings.init();
        const prefs = get(settings);
        if (!get(isConfigured)) {
            throw new Error('configure d\'abord l\'extension depuis son icône');
        }
        if (!(await hasOriginAccess(prefs.mailcowUrl))) {
            throw new Error('ouvre l\'extension depuis son icône pour autoriser l\'accès au serveur');
        }

        const lists = (await mailcowService.getCachedLists()) ?? (await mailcowService.loadLists());
        const domain = pickOption(lists.domains, prefs.lastDomain);
        const mailbox = pickOption(lists.mailboxes, prefs.lastMailbox);
        if (!domain || !mailbox) throw new Error('aucun domaine ou boîte mail actif sur le serveur');

        const site = getSite(pageUrl);
        const base = site?.name ?? '';
        const suffixed = () => addRandomSuffix(base, prefs.suffixSeparator).value;
        const comment = site ? siteComment(site) : '';

        let address = `${!base || prefs.suffixEnabled ? suffixed() : base}@${domain}`;
        try {
            await mailcowService.createAlias(address, mailbox, { comment });
        } catch (error) {
            // A second account on the same site: fall back to a suffixed alias.
            if (!(error instanceof MailcowError && error.isAlreadyTaken)) throw error;
            address = `${suffixed()}@${domain}`;
            await mailcowService.createAlias(address, mailbox, { comment });
        }

        const filled = await fillEmailFieldsInTab(tabId, address, { frameId });
        // Works from Firefox's event page; Chrome's service worker has no clipboard.
        const copied = await copyText(address);
        await showToastInTab(tabId, `${address} créé${filled ? ' et rempli' : ''}${copied ? ', copié' : ''}`, 'success');
    } catch (error) {
        await showToastInTab(tabId, `Mailcow Alias : ${error.message}`, 'error');
    }
}
