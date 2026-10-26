import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settings } from './settings.service.js'
import { MailcowError, mailcowService } from './mailcow.service.js'

vi.mock('./storage.service.js', () => {
    const data = new Map()
    return {
        storageService: {
            get: async (keys) => Object.fromEntries(keys.filter(k => data.has(k)).map(k => [k, data.get(k)])),
            set: async (items) => Object.entries(items).forEach(([k, v]) => data.set(k, v)),
        },
    }
})

const respond = (body, status = 200) =>
    vi.fn(async (/** @type {string} */ _url, /** @type {any} */ _init) => new Response(JSON.stringify(body), { status }))

beforeEach(() => {
    settings.save({ mailcowUrl: 'https://mail.example.com', apiKey: 'key' })
})
afterEach(() => {
    vi.unstubAllGlobals()
})

describe('createAlias', () => {
    it('reports Mailcow failures sent with HTTP 200', async () => {
        vi.stubGlobal('fetch', respond([{ type: 'danger', log: [], msg: ['is_alias_or_mailbox', 'a@b.dev'] }]))
        await expect(mailcowService.createAlias('a@b.dev', 'me@b.dev'))
            .rejects.toThrow(new MailcowError('a@b.dev existe déjà (alias ou boîte mail)'))
    })

    it('sends the API key and the alias', async () => {
        const fetch = respond([{ type: 'success', msg: ['alias_added', 'a@b.dev'] }])
        vi.stubGlobal('fetch', fetch)
        await mailcowService.createAlias('a@b.dev', 'me@b.dev')
        const [url, init] = fetch.mock.calls[0]
        expect(url).toBe('https://mail.example.com/api/v1/add/alias')
        expect(init.headers['X-API-Key']).toBe('key')
        expect(JSON.parse(init.body)).toEqual({ address: 'a@b.dev', goto: 'me@b.dev', active: 1 })
    })

    it('explains a refused key', async () => {
        vi.stubGlobal('fetch', respond({ type: 'error', msg: 'authentication failed' }, 401))
        await expect(mailcowService.createAlias('a@b.dev', 'me@b.dev')).rejects.toThrow(/Clé API refusée/)
    })
})

describe('loadLists', () => {
    it('keeps active entries, sorted', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url) => new Response(JSON.stringify(url.endsWith('domain/all')
            ? [{ domain_name: 'zeta.dev', active: 1 }, { domain_name: 'alpha.dev', active: '1' }, { domain_name: 'off.dev', active: 0 }]
            : [{ username: 'recv@zeta.dev', active: 2 }, { username: 'me@alpha.dev', active: 1 }]))))
        await expect(mailcowService.loadLists()).resolves.toEqual({
            domains: ['alpha.dev', 'zeta.dev'],
            mailboxes: ['me@alpha.dev', 'recv@zeta.dev'],
        })
    })
})
