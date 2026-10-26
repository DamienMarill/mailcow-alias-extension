import { fillEmailFields } from '../content/fill-email-fields.js'
import { showPageToast } from '../content/page-toast.js'

// Cross-browser access to the WebExtension APIs: Firefox exposes the promise
// based `browser` namespace, Chrome MV3 returns promises from `chrome`.
// Undefined when the popup is served outside an extension (vite dev server).
export const ext = globalThis.browser ?? globalThis.chrome

/**
 * Match pattern covering every port of the server's host
 * (Firefox match patterns can't contain a port).
 * @param {string} url
 */
export function originPattern(url) {
    const { protocol, hostname } = new URL(url)
    return `${protocol}//${hostname}/*`
}

/** @param {string} url */
export async function hasOriginAccess(url) {
    if (!ext?.permissions) return true
    try {
        return await ext.permissions.contains({ origins: [originPattern(url)] })
    } catch {
        return false
    }
}

/**
 * Must be called synchronously from a user gesture handler, before any await.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export function requestOriginAccess(url) {
    if (!ext?.permissions) return Promise.resolve(true)
    return ext.permissions.request({ origins: [originPattern(url)] }).catch(() => false)
}

/** The tab the popup was opened on; its URL is readable thanks to activeTab. */
export async function getActiveTab() {
    if (!ext?.tabs) return null
    try {
        const [tab] = await ext.tabs.query({ active: true, currentWindow: true })
        return tab ?? null
    } catch {
        return null
    }
}

/**
 * Runs fillEmailFields() in every frame of the tab that we can access, then
 * fills the frame holding the most relevant form only.
 * @param {number} tabId
 * @param {string} address
 * @param {{ dryRun?: boolean, frameId?: number }} [options]
 *   dryRun: only count the fields;
 *   frameId: fill this frame, including its focused field (context menu)
 * @returns {Promise<number>} number of fields found (dryRun) or filled
 */
export async function fillEmailFieldsInTab(tabId, address, { dryRun = false, frameId } = {}) {
    if (!ext?.scripting) return 0
    // Only a right-clicked field is a deliberate target: from the popup, the
    // page's focused field may be any text field.
    const includeFocused = frameId !== undefined
    try {
        if (frameId === undefined) {
            const scans = await ext.scripting.executeScript({
                target: { tabId, allFrames: true },
                func: fillEmailFields,
                args: [address, { dryRun: true }],
            })
            const best = scans
                .filter(scan => scan.result?.score > 0)
                .sort((a, b) => b.result.score - a.result.score)[0]
            if (!best || dryRun) return best?.result.count ?? 0
            frameId = best.frameId
        }

        const [fill] = await ext.scripting.executeScript({
            target: { tabId, frameIds: [frameId] },
            func: fillEmailFields,
            args: [address, { includeFocused }],
        })
        return fill?.result?.filled ?? 0
    } catch {
        // Pages where extensions can't run: browser pages, extension stores…
        return 0
    }
}

/**
 * Shows a short message at the bottom of the page (context menu feedback,
 * where no popup is open).
 * @param {number} tabId
 * @param {string} message
 * @param {'success' | 'error'} type
 */
export async function showToastInTab(tabId, message, type) {
    try {
        await ext.scripting.executeScript({ target: { tabId }, func: showPageToast, args: [message, type] })
    } catch {
        // Nothing to show it in.
    }
}

/** @param {string} text */
export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}
