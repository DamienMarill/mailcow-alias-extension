import { expect, test } from './test.js'

test.beforeEach(async ({ configure }) => {
    await configure()
})

async function createAlias(popup) {
    await popup.getByRole('button', { name: "Créer l'alias" }).click()
    await expect(popup.getByText(/^Alias créé/)).toBeVisible()
}

test('fills a React signup form so its state and validation see it', async ({ openSite, openPopup }) => {
    const site = await openSite('/react.html')
    const popup = await openPopup(site)
    await expect(popup.getByText('Sera aussi rempli dans 2 champs de la page.')).toBeVisible()

    await createAlias(popup)
    await expect(popup.getByText('Alias créé, rempli dans 2 champs et copié !')).toBeVisible()
    await expect(site.locator('#state')).toHaveText(JSON.stringify({
        email: 'localhost@alpha.dev',
        confirm: 'localhost@alpha.dev',
        password: '',
    }))
    await expect(site.locator('#validation')).toHaveText('ok')
    // The footer newsletter is not the form being filled.
    await expect(site.locator('input[name=nl]')).toHaveValue('')
})

test('fills a formless page and fires each event once', async ({ openSite, openPopup }) => {
    const site = await openSite('/vanilla.html')
    await createAlias(await openPopup(site))

    const values = await site.locator('input').evaluateAll(inputs => inputs.map(i => [i.name, i.value]))
    expect(Object.fromEntries(values)).toEqual({
        q: '', hidden: '', mail: 'localhost@alpha.dev', mail2: 'localhost@alpha.dev', '': '', nick: '',
    })
    const events = ['focus', 'focusin', 'keydown', 'keypress', 'input', 'keyup', 'change', 'blur', 'focusout']
    expect(await site.evaluate(() => window.eventLog)).toEqual([
        ...events.map(event => `mail:${event}`),
        ...events.map(event => `mail2:${event}`),
    ])
})

test('fills a field inside a closed shadow root', async ({ openSite, openPopup }) => {
    const site = await openSite('/shadow.html')
    await createAlias(await openPopup(site))
    expect(await site.evaluate(() => window.readShadowEmail())).toBe('localhost@alpha.dev')
})

test('picks the signup form of an iframe over the page newsletter', async ({ openSite, openPopup }) => {
    const site = await openSite('/frame.html')
    await createAlias(await openPopup(site))

    const inner = site.frames().find(frame => frame !== site.mainFrame())
    await expect(inner.locator('input[name=email]')).toHaveValue('localhost@alpha.dev')
    await expect(inner.locator('input[name=email_confirmation]')).toHaveValue('localhost@alpha.dev')
    await expect(site.locator('input[name=nl]')).toHaveValue('')
})

test('leaves the page alone when the option is off', async ({ openSite, openPopup }) => {
    const settings = await openPopup()
    await settings.getByLabel('Paramètres').click()
    await settings.getByLabel('Remplir les champs email de la page').uncheck()

    const site = await openSite('/react.html')
    const popup = await openPopup(site)
    await popup.getByRole('button', { name: "Créer l'alias" }).click()
    await expect(popup.getByText('Alias créé et copié !')).toBeVisible()
    await expect(site.locator('#email')).toHaveValue('')
})
