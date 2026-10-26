import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { FIXTURES_DIST } from './global-setup.js'

export const API_KEY = 'e2e-key'

const DOMAINS = [
    { domain_name: 'zeta.dev', active: 1 },
    { domain_name: 'alpha.dev', active: '1' },
    { domain_name: 'off.dev', active: 0 },
]
const MAILBOXES = [
    { username: 'recv@zeta.dev', active: 2 },
    { username: 'me@alpha.dev', active: 1 },
]

/** In-memory Mailcow API following the behaviour of data/web/json_api.php. */
function createMailcow() {
    let aliases = []
    let nextId = 1

    const ok = (msg) => [{ type: 'success', log: [], msg }]
    const danger = (msg) => [{ type: 'danger', log: [], msg }]

    return {
        get aliases() { return aliases },
        /** @param {{ address: string, goto?: string, active?: number, private_comment?: string }} alias */
        addAlias(alias) {
            const entry = { id: nextId++, goto: 'me@alpha.dev', active: 1, private_comment: null, ...alias }
            aliases.push(entry)
            return entry
        },
        handle(method, path, body) {
            if (path === 'get/domain/all') return DOMAINS
            if (path === 'get/mailbox/all') return MAILBOXES
            if (path === 'get/alias/all') {
                return aliases.map(a => ({ ...a, active: String(a.active), active_int: a.active, is_catch_all: 0 }))
            }
            if (method !== 'POST') return { type: 'error', msg: 'only POST method is allowed' }
            if (path === 'add/alias') {
                if (aliases.some(a => a.address === body.address)) return danger(['is_alias_or_mailbox', body.address])
                if ((body.private_comment ?? '').length > 160) return danger('comment_too_long')
                this.addAlias({ ...body, active: Number(body.active) })
                return ok(['alias_added', body.address])
            }
            if (path === 'edit/alias') {
                for (const alias of aliases.filter(a => body.items.includes(String(a.id)))) {
                    alias.active = Number(body.attr.active)
                }
                return ok(['alias_modified', body.items.join(',')])
            }
            if (path === 'delete/alias') {
                aliases = aliases.filter(a => !body.includes(String(a.id)))
                return ok(['alias_removed', body.join(',')])
            }
            return null
        },
    }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

function listen(handler) {
    const server = http.createServer(handler)
    return new Promise(resolve => server.listen(0, 'localhost', () => resolve(server)))
}

/**
 * Two servers on different ports (= different origins): the main one serves
 * the Mailcow API and the fixture pages, the other one the cross-origin iframe.
 */
export async function startServers() {
    const mailcow = createMailcow()
    let innerOrigin = ''

    const handler = (req, res) => {
        let raw = ''
        req.on('data', chunk => (raw += chunk))
        req.on('end', async () => {
            const url = new URL(req.url, 'http://localhost')
            if (url.pathname.startsWith('/api/v1/')) {
                res.setHeader('Content-Type', 'application/json')
                if (req.headers['x-api-key'] !== API_KEY) {
                    res.statusCode = 401
                    return res.end(JSON.stringify({ type: 'error', msg: 'authentication failed' }))
                }
                const result = mailcow.handle(req.method, url.pathname.slice('/api/v1/'.length), raw ? JSON.parse(raw) : null)
                res.statusCode = result ? 200 : 404
                return res.end(JSON.stringify(result ?? {}))
            }
            try {
                const file = normalize(join(FIXTURES_DIST, url.pathname)).replace(/\/$/, '/index.html')
                if (!file.startsWith(FIXTURES_DIST)) throw new Error('outside fixtures')
                const content = (await readFile(file, 'utf8')).replaceAll('__INNER_ORIGIN__', innerOrigin)
                res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
                res.end(content)
            } catch {
                res.statusCode = 404
                res.end('not found')
            }
        })
    }

    const main = await listen(handler)
    const inner = await listen(handler)
    innerOrigin = `http://localhost:${inner.address().port}`

    return {
        mailcow,
        origin: `http://localhost:${main.address().port}`,
        close: () => Promise.all([main, inner].map(server => new Promise(resolve => {
            server.close(resolve)
            // Keep-alive connections from the browser would hold close() forever.
            server.closeAllConnections()
        }))),
    }
}
