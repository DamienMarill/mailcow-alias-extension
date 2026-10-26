import { ext } from './lib/browser.js';
import { createAliasInPage } from './background/create-alias-in-page.js';

const MENU_ID = 'create-alias';

async function setUpMenu() {
    await ext.contextMenus.removeAll();
    ext.contextMenus.create({
        id: MENU_ID,
        title: 'Créer un alias Mailcow ici',
        contexts: ['editable'],
    });
}

// Listeners are registered synchronously: the service worker / event page
// is woken up for them.
ext.runtime.onInstalled.addListener(setUpMenu);
ext.runtime.onStartup.addListener(setUpMenu);

ext.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || tab?.id === undefined) return;
    createAliasInPage(tab.id, info.pageUrl ?? tab.url ?? '', info.frameId ?? 0);
});

// The Playwright tests can't click native context menus.
if (import.meta.env.MODE === 'e2e') {
    globalThis.e2e = { createAliasInPage };
}
