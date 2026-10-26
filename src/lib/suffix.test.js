import { describe, expect, it } from 'vitest'
import { addRandomSuffix, randomSuffix } from './suffix.js'

describe('randomSuffix', () => {
    it('uses 5 unambiguous characters', () => {
        for (let i = 0; i < 200; i++) expect(randomSuffix()).toMatch(/^[a-hjkmnp-z2-9]{5}$/)
    })
})

describe('addRandomSuffix', () => {
    it('appends a suffix with the separator', () => {
        const { value, suffix } = addRandomSuffix('amazon', '-')
        expect(value).toMatch(/^amazon-[a-z2-9]{5}$/)
        expect(value.endsWith(suffix)).toBe(true)
    })

    it('replaces the suffix it added before', () => {
        const first = addRandomSuffix('fast-track', '.')
        const second = addRandomSuffix(first.value, '.', first.suffix)
        expect(second.value).toMatch(/^fast-track\.[a-z2-9]{5}$/)
    })

    it('keeps text the user typed after the suffix', () => {
        const first = addRandomSuffix('shop', '.')
        const edited = `${first.value}x`
        expect(addRandomSuffix(edited, '.', first.suffix).value.startsWith(edited)).toBe(true)
    })

    it('gives a bare suffix for an empty alias', () => {
        expect(addRandomSuffix('', '.').value).toMatch(/^[a-z2-9]{5}$/)
    })
})
