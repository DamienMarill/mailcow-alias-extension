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

export async function getActiveTabUrl() {
    if (!ext?.tabs) return ''
    try {
        const [tab] = await ext.tabs.query({ active: true, currentWindow: true })
        return tab?.url ?? ''
    } catch {
        return ''
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
