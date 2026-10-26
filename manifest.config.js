// Single source for the extension manifest. Each browser target gets its own
// variant; the version always comes from package.json.

// Firefox needs a stable ID: never change it once the add-on is published on AMO.
const GECKO_ID = 'mailcow-alias-extension@damienmarill'

const icons = {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
}

/**
 * @param {'chrome' | 'firefox'} target
 * @param {string} version
 * @param {{ e2e?: boolean }} [options] e2e: end-to-end test build
 */
export function createManifest(target, version, { e2e = false } = {}) {
    // Stores only accept 1 to 4 dot-separated integers (no "-beta" suffix).
    if (!/^\d+(\.\d+){0,3}$/.test(version)) {
        throw new Error(`Invalid extension version "${version}": use digits and dots only`)
    }

    const manifest = {
        manifest_version: 3,
        name: 'Mailcow Alias Manager',
        description: 'Crée un alias Mailcow pour le site courant en un clic.',
        version,
        icons,
        action: {
            default_popup: 'index.html',
            default_title: 'Créer un alias Mailcow',
            default_icon: icons,
        },
        // activeTab + scripting: fill the email fields of the current page on demand.
        // contextMenus: "create an alias here" on the page's fields.
        permissions: ['storage', 'activeTab', 'scripting', 'clipboardWrite', 'contextMenus'],
        // Access is requested at runtime for the configured Mailcow server only.
        optional_host_permissions: ['https://*/*', 'http://*/*'],
        commands: {
            _execute_action: {
                suggested_key: { default: 'Alt+Shift+M' },
                description: 'Ouvrir Mailcow Alias',
            },
        },
    }

    // Chrome only runs service workers, Firefox only event pages.
    manifest.background = target === 'firefox'
        ? { scripts: ['background.js'], type: 'module' }
        : { service_worker: 'background.js', type: 'module' }

    if (e2e) {
        // Pre-granted for the local mock server: permission prompts can't be clicked in tests.
        manifest.host_permissions = ['http://localhost/*']
    }

    if (target === 'firefox') {
        manifest.browser_specific_settings = {
            gecko: {
                id: GECKO_ID,
                strict_min_version: '140.0',
                // Data only goes to the user's own Mailcow server.
                data_collection_permissions: { required: ['none'] },
            },
            gecko_android: {
                strict_min_version: '142.0',
            },
        }
    }

    return manifest
}
