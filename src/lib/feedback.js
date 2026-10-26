import { notifications } from '../services/notification.service.js'
import { copyText, fillEmailFieldsInTab } from './browser.js'

/** @param {number} count */
export const fieldsLabel = (count) => `${count} champ${count > 1 ? 's' : ''}`

/**
 * @param {number} tabId
 * @param {string} address
 */
export async function fillWithFeedback(tabId, address) {
    const filled = await fillEmailFieldsInTab(tabId, address)
    if (filled) notifications.success(`Rempli dans ${fieldsLabel(filled)} de la page`)
    else notifications.add('Aucun champ email trouvé sur la page', 'warning')
}

/** @param {string} address */
export async function copyWithFeedback(address) {
    if (await copyText(address)) notifications.success(`${address} copié`)
    else notifications.error('Copie impossible')
}
