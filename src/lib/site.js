import { aliasFromUrl } from './url.js'
import { SEPARATORS } from './suffix.js'

const COMMENT_PREFIX = 'Créé par Mailcow Alias depuis'

/**
 * The site the popup was opened on.
 * @typedef {{ name: string, host: string, origin: string }} Site
 * @param {string} url
 * @returns {Site | null} null for pages that aren't websites
 */
export function getSite(url) {
    const name = aliasFromUrl(url)
    if (!name) return null
    const { hostname, origin } = new URL(url)
    return { name, host: hostname.replace(/^www\d*\./, ''), origin }
}

/**
 * Private comment stored on the alias: tells which site an alias was given
 * to (the day it receives spam) and finds it again from that site.
 * Only the origin: paths and query strings can contain tokens.
 * @param {Site} site
 */
export function siteComment(site) {
    return `${COMMENT_PREFIX} ${site.origin}`
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * An alias belongs to the site when its comment names the site's host, or when
 * it is named after the site: amazon@…, amazon.k3x9q@…, amazon-pro@…
 * @param {{ address: string, comment: string }} alias
 * @param {Site} site
 */
export function matchesSite(alias, site) {
    const localPart = alias.address.split('@')[0].toLowerCase()
    if (localPart === site.name || SEPARATORS.some(separator => localPart.startsWith(site.name + separator))) {
        return true
    }
    const hostPattern = new RegExp(`(^|[\\s/.])${escapeRegExp(site.host)}($|[\\s/:])`, 'i')
    return hostPattern.test(alias.comment)
}
