import { expect, test } from './test.js'

test.beforeEach(async ({ configure, servers }) => {
    servers.mailcow.addAlias({ address: 'localhost.k3x9q@alpha.dev' })
    servers.mailcow.addAlias({ address: 'shop@alpha.dev', private_comment: `Créé par Mailcow Alias depuis ${servers.origin}` })
    servers.mailcow.addAlias({ address: 'netflix@alpha.dev' })
    await configure()
})

test('lists the aliases of the site, by name and by comment', async ({ openSite, openPopup }) => {
    const popup = await openPopup(await openSite('/login.html'))
    const list = popup.getByRole('region', { name: 'Alias existants' })
    await expect(list.getByText('Déjà créés pour localhost')).toBeVisible()
    await expect(list.getByRole('listitem')).toHaveText(['localhost.k3x9q@alpha.dev', 'shop@alpha.dev'])
})

test('disables, re-enables and deletes an alias', async ({ openSite, openPopup, servers }) => {
    const popup = await openPopup(await openSite('/login.html'))
    const shop = () => servers.mailcow.aliases.find(a => a.address === 'shop@alpha.dev')

    await popup.getByLabel('Désactiver shop@alpha.dev').click()
    await expect(popup.getByText('shop@alpha.dev désactivé')).toBeVisible()
    expect(shop().active).toBe(0)

    await popup.getByLabel('Réactiver shop@alpha.dev').click()
    await expect(popup.getByText('shop@alpha.dev réactivé')).toBeVisible()
    expect(shop().active).toBe(1)

    await popup.getByLabel('Supprimer shop@alpha.dev').click()
    // Deleting takes a confirmation click.
    expect(shop()).toBeDefined()
    await popup.getByRole('button', { name: 'Supprimer ?' }).click()
    await expect(popup.getByText('shop@alpha.dev supprimé')).toBeVisible()
    expect(shop()).toBeUndefined()
    await expect(popup.getByRole('listitem')).toHaveText(['localhost.k3x9q@alpha.dev'])
})

test('fills the page with an existing alias', async ({ openSite, openPopup }) => {
    const site = await openSite('/react.html')
    const popup = await openPopup(site)
    await popup.getByLabel('Remplir la page avec shop@alpha.dev').click()
    await expect(popup.getByText('Rempli dans 2 champs de la page', { exact: true })).toBeVisible()
    await expect(site.locator('#email')).toHaveValue('shop@alpha.dev')
})
