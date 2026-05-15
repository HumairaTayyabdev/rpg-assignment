import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20000,
    viewportWidth: 1280,
    viewportHeight: 800,
    env: {
      e2ePaceMs: 850,
      e2eTypeDelayMs: 40,
    },
  },
})
