import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { createManifest } from './manifest.config.js'

const TARGETS = ['chrome', 'firefox']
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/** Emits the manifest.json matching the browser target. */
function webExtensionManifest(target) {
    return {
        name: 'web-extension-manifest',
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'manifest.json',
                source: JSON.stringify(createManifest(target, version), null, 2),
            })
        },
        // Extension pages are same-origin: the crossorigin attribute is useless there.
        transformIndexHtml: (html) => html.replaceAll(' crossorigin', ''),
    }
}

// The browser target is selected with `vite build --mode chrome|firefox`.
export default defineConfig(({ mode }) => {
    const target = TARGETS.includes(mode) ? mode : 'chrome'

    return {
        base: './',
        plugins: [svelte(), tailwindcss(), webExtensionManifest(target)],
        test: {
            include: ['src/**/*.test.js'],
        },
        build: {
            outDir: `dist/${target}`,
            emptyOutDir: true,
            modulePreload: { polyfill: false },
        },
    }
})
