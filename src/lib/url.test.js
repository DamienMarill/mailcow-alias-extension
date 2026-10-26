import { describe, expect, it } from 'vitest'
import { aliasFromUrl, normalizeServerUrl, sanitizeLocalPart } from './url.js'

describe('aliasFromUrl', () => {
    it.each([
        ['https://www.amazon.co.uk/dp/123', 'amazon'],
        ['https://accounts.google.com/signup', 'google'],
        ['https://service-public.gouv.fr', 'service-public'],
        ['http://localhost:3000', 'localhost'],
    ])('%s → %s', (url, alias) => {
        expect(aliasFromUrl(url)).toBe(alias)
    })

    it.each(['chrome://newtab', 'about:blank', 'http://192.168.1.1', 'http://[::1]/', 'https://xn--bcher-kva.de', 'not a url'])(
        'gives no suggestion for %s', (url) => {
            expect(aliasFromUrl(url)).toBe('')
        })
})

describe('sanitizeLocalPart', () => {
    it('lowercases, strips accents and forbidden characters', () => {
        expect(sanitizeLocalPart('  Café Crème!+news ')).toBe('cafecreme+news')
    })
})

describe('normalizeServerUrl', () => {
    it.each([
        ['mail.example.com', 'https://mail.example.com'],
        ['https://mail.example.com/SOGo/', 'https://mail.example.com'],
        ['http://mail.example.com:8443/', 'http://mail.example.com:8443'],
        ['   ', ''],
        ['ht tp://x', ''],
    ])('%j → %j', (input, expected) => {
        expect(normalizeServerUrl(input)).toBe(expected)
    })
})
