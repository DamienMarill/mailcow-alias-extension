import { defineConfig } from '@playwright/test'

// End-to-end tests of the Chrome build (`npm run test:e2e`): popup, autofill,
// alias list and context menu against a mock Mailcow server.
export default defineConfig({
    testDir: 'tests/e2e',
    globalSetup: './tests/e2e/global-setup.js',
    timeout: 30_000,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI ? [['github'], ['list']] : 'list',
})
