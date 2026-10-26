// Second-level labels used under country TLDs (amazon.co.uk, service-public.gouv.fr…)
const SECOND_LEVEL_LABELS = new Set(['co', 'com', 'org', 'net', 'gov', 'gouv', 'edu', 'ac', 'or', 'ne'])

/**
 * Suggests an alias local part from a page URL: https://www.amazon.co.uk/… → "amazon".
 * Returns '' for non-web pages, IP addresses and internationalized domains.
 * @param {string} url
 */
export function aliasFromUrl(url) {
    let hostname
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
        hostname = parsed.hostname
    } catch {
        return ''
    }

    if (/^[\d.]+$/.test(hostname) || hostname.startsWith('[')) return ''

    const labels = hostname.replace(/^www\d*\./, '').split('.')
    if (labels.length > 1) labels.pop()
    if (labels.length > 1 && SECOND_LEVEL_LABELS.has(labels.at(-1))) labels.pop()

    const name = labels.at(-1) ?? ''
    // Punycode (IDN) labels would give an unreadable alias: let the user type it.
    return name.startsWith('xn--') ? '' : sanitizeLocalPart(name)
}

/** @param {string} value */
export function sanitizeLocalPart(value) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9._+-]/g, '')
}

/**
 * Normalizes what the user typed as the Mailcow address: adds https:// when
 * missing and keeps only the origin. Returns '' when it isn't a valid URL.
 * @param {string} input
 */
export function normalizeServerUrl(input) {
    let value = input.trim()
    if (!value) return ''
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`
    try {
        return new URL(value).origin
    } catch {
        return ''
    }
}
