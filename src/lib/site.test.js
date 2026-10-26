import { describe, expect, it } from 'vitest'
import { getSite, matchesSite, siteComment } from './site.js'

const amazon = getSite('https://www.amazon.fr/ap/register?token=secret')

describe('getSite', () => {
    it('describes a website', () => {
        expect(amazon).toEqual({ name: 'amazon', host: 'amazon.fr', origin: 'https://www.amazon.fr' })
    })

    it('ignores browser pages', () => {
        expect(getSite('chrome://extensions')).toBeNull()
    })
})

describe('siteComment', () => {
    it('keeps the origin only, never the path or query', () => {
        expect(siteComment(amazon)).toBe('Créé par Mailcow Alias depuis https://www.amazon.fr')
    })
})

describe('matchesSite', () => {
    const alias = (address, comment = '') => ({ address, comment })

    it.each(['amazon@x.dev', 'amazon.k3x9q@x.dev', 'amazon-pro@x.dev', 'Amazon_2@x.dev'])('matches %s by name', (address) => {
        expect(matchesSite(alias(address), amazon)).toBe(true)
    })

    it('matches by comment whatever the name', () => {
        expect(matchesSite(alias('shopping@x.dev', siteComment(amazon)), amazon)).toBe(true)
    })

    it.each([
        alias('amazonia@x.dev'),
        alias('netflix@x.dev', 'Créé par Mailcow Alias depuis https://notamazon.fr'),
        alias('other@x.dev', 'Créé par Mailcow Alias depuis https://amazon.fr.evil.com'),
    ])('does not match $address', (other) => {
        expect(matchesSite(other, amazon)).toBe(false)
    })
})
