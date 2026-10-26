import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, chromium, expect } from '@playwright/test'
import { API_KEY, startServers } from './servers.js'

const EXTENSION_DIR = fileURLToPath(new URL('../../dist/e2e', import.meta.url))

/**
 * @typedef {import('@playwright/test').Page} Page
 * @typedef {{
 *   servers: Awaited<ReturnType<typeof startServers>>,
 *   context: import('@playwright/test').BrowserContext,
 *   background: import('@playwright/test').Worker,
 *   extensionId: string,
 *   openSite: (path: string) => Promise<Page>,
 *   openPopup: (site?: Page) => Promise<Page>,
 *   configure: () => Promise<void>,
 * }} Fixtures
 */

/** @type {import('@playwright/test').TestType<Fixtures, {}>} */
export const test = base.extend({
    servers: async ({}, use) => {
        const servers = await startServers()
        await use(servers)
        await servers.close()
    },

    context: async ({}, use) => {
        const profile = await mkdtemp(join(tmpdir(), 'mailcow-alias-e2e-'))
        const context = await chromium.launchPersistentContext(profile, {
            channel: 'chromium',
            headless: true,
            // Lets a sandbox reuse an already installed Chromium.
            executablePath: process.env.CHROMIUM_PATH || undefined,
            args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
        })
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await use(context)
        await context.close()
        await rm(profile, { recursive: true, force: true })
    },

    background: async ({ context }, use) => {
        await use(context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'))
    },

    extensionId: async ({ background }, use) => {
        await use(new URL(background.url()).host)
    },

    openSite: async ({ context, servers }, use) => {
        await use(async (path) => {
            const page = await context.newPage()
            await page.goto(`${servers.origin}${path}`)
            return page
        })
    },

    openPopup: async ({ context, extensionId }, use) => {
        await use(async (site) => {
            const popup = await context.newPage()
            await popup.setViewportSize({ width: 360, height: 600 })
            // The real popup belongs to the active tab: point tabs.query at the site page.
            await popup.addInitScript((siteUrl) => {
                const query = chrome.tabs.query.bind(chrome.tabs)
                chrome.tabs.query = (filter) => filter.active
                    ? query({}).then(tabs => tabs.filter(tab => siteUrl && tab.url === siteUrl))
                    : query(filter)
            }, site?.url() ?? '')
            await popup.goto(`chrome-extension://${extensionId}/index.html`)
            return popup
        })
    },

    configure: async ({ openPopup, servers }, use) => {
        await use(async () => {
            const popup = await openPopup()
            await popup.getByLabel('URL Mailcow').fill(servers.origin)
            await popup.getByLabel('Clé API').fill(API_KEY)
            await popup.getByRole('button', { name: 'Enregistrer et tester' }).click()
            await expect(popup.getByText('Connecté')).toBeVisible()
            await popup.close()
        })
    },
})

export { expect }
