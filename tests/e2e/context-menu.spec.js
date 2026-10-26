import { expect, test } from './test.js'

/** Native menus can't be clicked: run the menu handler of the e2e build. */
function clickMenu(background, page) {
    return background.evaluate(async (url) => {
        const [tab] = (await chrome.tabs.query({})).filter(t => t.url === url)
        await globalThis.e2e.createAliasInPage(tab.id, tab.url, 0)
    }, page.url())
}

test('creates an alias and fills the right-clicked field', async ({ configure, openSite, background, servers }) => {
    await configure()
    const site = await openSite('/login.html')
    await site.locator('input[name=login]').click()

    await clickMenu(background, site)
    await expect(site.locator('input[name=login]')).toHaveValue('localhost@alpha.dev')
    await expect(site.locator('#mailcow-alias-toast')).toBeAttached()
    expect(servers.mailcow.aliases).toEqual([expect.objectContaining({
        address: 'localhost@alpha.dev',
        private_comment: `Créé par Mailcow Alias depuis ${servers.origin}`,
    })])
})

test('falls back to a suffixed alias when the name is taken', async ({ configure, openSite, background, servers }) => {
    servers.mailcow.addAlias({ address: 'localhost@alpha.dev' })
    await configure()
    const site = await openSite('/login.html')
    await site.locator('input[name=login]').click()

    await clickMenu(background, site)
    await expect(site.locator('input[name=login]')).toHaveValue(/^localhost\.[a-z2-9]{5}@alpha\.dev$/)
    expect(servers.mailcow.aliases).toHaveLength(2)
})

test('tells to configure the extension first', async ({ openSite, background, servers }) => {
    const site = await openSite('/login.html')
    await clickMenu(background, site)
    await expect(site.locator('#mailcow-alias-toast')).toBeAttached()
    await expect(site.locator('input[name=login]')).toHaveValue('')
    expect(servers.mailcow.aliases).toHaveLength(0)
})
