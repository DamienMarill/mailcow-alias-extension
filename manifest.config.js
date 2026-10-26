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
 */
export function createManifest(target, version) {
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
        permissions: ['storage', 'activeTab', 'clipboardWrite'],
        // Access is requested at runtime for the configured Mailcow server only.
        optional_host_permissions: ['https://*/*', 'http://*/*'],
        commands: {
            _execute_action: {
                suggested_key: { default: 'Alt+Shift+M' },
                description: 'Ouvrir Mailcow Alias',
            },
        },
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
