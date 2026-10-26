import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { createManifest } from './manifest.config.js'

const TARGETS = ['chrome', 'firefox']
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/** Emits the manifest.json matching the browser target. */
function webExtensionManifest(target, options) {
    return {
        name: 'web-extension-manifest',
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'manifest.json',
                source: JSON.stringify(createManifest(target, version, options), null, 2),
            })
        },
        // Extension pages are same-origin: the crossorigin attribute is useless there.
        transformIndexHtml: (html) => html.replaceAll(' crossorigin', ''),
    }
}

// The browser target is selected with `vite build --mode chrome|firefox`.
// `--mode e2e` builds the Chrome variant used by the Playwright tests.
export default defineConfig(({ mode }) => {
    const target = TARGETS.includes(mode) ? mode : 'chrome'
    const e2e = mode === 'e2e'

    return {
        base: './',
        plugins: [svelte(), tailwindcss(), webExtensionManifest(target, { e2e })],
        test: {
            include: ['src/**/*.test.js'],
        },
        build: {
            outDir: `dist/${e2e ? 'e2e' : target}`,
            emptyOutDir: true,
            modulePreload: { polyfill: false },
            rolldownOptions: {
                input: { popup: 'index.html', background: 'src/background.js' },
                output: {
                    // The manifest points at a fixed file name.
                    entryFileNames: (chunk) => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
                    chunkFileNames: 'assets/shared-[hash].js',
                },
            },
        },
    }
})
