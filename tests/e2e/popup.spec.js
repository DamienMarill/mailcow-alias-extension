import { expect, test } from './test.js'
import { API_KEY } from './servers.js'

test('first run: refuses a bad key, then connects', async ({ openPopup, servers }) => {
    const popup = await openPopup()
    await expect(popup.getByText('Bienvenue')).toBeVisible()
    await popup.getByLabel('URL Mailcow').fill(servers.origin)
    await popup.getByLabel('Clé API', { exact: true }).fill('wrong')
    await popup.getByRole('button', { name: 'Enregistrer et tester' }).click()
    await expect(popup.getByText('Clé API refusée')).toBeVisible()

    await popup.getByLabel('Clé API', { exact: true }).fill(API_KEY)
    await popup.getByRole('button', { name: 'Enregistrer et tester' }).click()
    await expect(popup.getByText('Connecté : 2 domaine(s) trouvé(s)')).toBeVisible()
    await expect(popup.getByRole('button', { name: "Créer l'alias" })).toBeVisible()
})

test('creates an alias named after the site, with its origin as comment', async ({ configure, openSite, openPopup, servers }) => {
    await configure()
    const site = await openSite('/login.html')
    const popup = await openPopup(site)

    await expect(popup.getByLabel('Alias', { exact: true })).toHaveValue('localhost')
    await popup.getByLabel('Domaine').selectOption('zeta.dev')
    await popup.getByRole('button', { name: "Créer l'alias" }).click()

    await expect(popup.getByText('Alias créé et copié !')).toBeVisible()
    expect(await popup.evaluate(() => navigator.clipboard.readText())).toBe('localhost@zeta.dev')
    expect(servers.mailcow.aliases).toEqual([expect.objectContaining({
        address: 'localhost@zeta.dev',
        goto: 'me@alpha.dev',
        active: 1,
        private_comment: `Créé par Mailcow Alias depuis ${servers.origin}`,
    })])
    await expect(popup.getByRole('listitem').filter({ hasText: 'localhost@zeta.dev' })).toBeVisible()

    // The domain is remembered for the next alias.
    const again = await openPopup(site)
    await expect(again.getByLabel('Domaine')).toHaveValue('zeta.dev')
})

test('explains Mailcow errors returned with HTTP 200', async ({ configure, openSite, openPopup, servers }) => {
    servers.mailcow.addAlias({ address: 'localhost@alpha.dev' })
    await configure()
    const popup = await openPopup(await openSite('/login.html'))

    await popup.getByRole('button', { name: "Créer l'alias" }).click()
    await expect(popup.getByText('localhost@alpha.dev existe déjà (alias ou boîte mail)')).toBeVisible()
    expect(servers.mailcow.aliases).toHaveLength(1)
})

test('adds a random suffix when the option is on, the dice regenerates it', async ({ configure, openSite, openPopup }) => {
    await configure()
    const settings = await openPopup()
    await settings.getByLabel('Paramètres').click()
    await settings.getByLabel('Ajouter un suffixe aléatoire').check()
    await settings.getByLabel('Séparateur du suffixe').selectOption('-')

    const popup = await openPopup(await openSite('/login.html'))
    const alias = popup.getByLabel('Alias', { exact: true })
    await expect(alias).toHaveValue(/^localhost-[a-z2-9]{5}$/)
    const first = await alias.inputValue()

    await popup.getByLabel('Ajouter un suffixe aléatoire').click()
    await expect(alias).toHaveValue(/^localhost-[a-z2-9]{5}$/)
    expect(await alias.inputValue()).not.toBe(first)
})
