import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

export const FIXTURES_DIR = fileURLToPath(new URL('./fixtures', import.meta.url))
export const FIXTURES_DIST = fileURLToPath(new URL('./.fixtures', import.meta.url))

/** Bundles the fixture pages (the React one needs a build). */
export default async function globalSetup() {
    const pages = readdirSync(FIXTURES_DIR).filter(file => file.endsWith('.html'))
    await build({
        configFile: false,
        root: FIXTURES_DIR,
        base: './',
        logLevel: 'warn',
        oxc: { jsx: { runtime: 'automatic' } },
        build: {
            outDir: FIXTURES_DIST,
            emptyOutDir: true,
            rolldownOptions: { input: pages.map(page => `${FIXTURES_DIR}/${page}`) },
        },
    })
}
