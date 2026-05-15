/// <reference types="cypress" />
import { e2ePaceMs, e2eTypeDelayMs } from './pace'

Cypress.Commands.add('pauseE2ePace', () => {
  cy.wait(e2ePaceMs())
})

Cypress.Commands.add('waitForBlogsFeedReady', () => {
  cy.get('[data-cy=blogs-root]', { timeout: 20000 }).should('be.visible')
  cy.get('[data-cy=blogs-root]', { timeout: 30000 }).within(() => {
    cy.contains('button', 'All blogs').should('be.visible')
    cy.contains('button', 'My blogs').should('be.visible')
  })
})

Cypress.Commands.add('openHeaderAccountMenu', () => {
  cy.get('header.app-header', { timeout: 20000 })
    .should('be.visible')
    .find('button[aria-label="Account menu"]')
    .should('be.visible')
    .click()
})

Cypress.Commands.add('signOutThroughUi', () => {
  cy.openHeaderAccountMenu()
  cy.pauseE2ePace()
  cy.get('header.app-header', { timeout: 10000 })
    .contains('button', 'Sign out')
    .should('be.visible')
    .click()
})

Cypress.Commands.add('openNotificationsPanel', () => {
  cy.pauseE2ePace()
  cy.get('header.app-header', { timeout: 10000 })
    .find('button[aria-label="Notifications"]')
    .should('be.visible')
    .click()
})

Cypress.Commands.add('fillAndPublishBlogPost', (title: string, body: string) => {
  cy.pauseE2ePace()
  cy.contains('h2#modal-title', 'New blog post', { timeout: 20000 })
    .should('be.visible')
    .closest('[role="dialog"]')
    .within(() => {
      const d = e2eTypeDelayMs()
      cy.get('input[name="title"]').should('be.visible').clear().type(title, { delay: d })
      cy.wait(e2ePaceMs() / 4)
      cy.get('textarea[name="content"]').should('be.visible').clear().type(body, { delay: d })
      cy.wait(e2ePaceMs() / 4)
      cy.contains('button', 'Publish post').should('be.visible').click()
    })
})

Cypress.Commands.add('expectBlogComposerClosed', () => {
  cy.contains('h2#modal-title', 'New blog post', { timeout: 20000 }).should('not.exist')
})

Cypress.Commands.add('signUpThroughUi', (displayName: string, email: string, password: string) => {
  const d = e2eTypeDelayMs()
  cy.visit('/')
  cy.get('[data-cy=auth-page]').should('be.visible')
  cy.pauseE2ePace()
  cy.get('[data-cy=auth-name]').clear()
  cy.get('[data-cy=auth-name]').type(displayName, { delay: d })
  cy.get('[data-cy=auth-email]').clear()
  cy.get('[data-cy=auth-email]').type(email, { delay: d })
  cy.get('[data-cy=auth-password]').clear()
  cy.get('[data-cy=auth-password]').type(password, { delay: d })
  cy.pauseE2ePace()
  cy.get('[data-cy=auth-submit]').click()
})

Cypress.Commands.add('logInThroughUi', (email: string, password: string) => {
  const d = e2eTypeDelayMs()
  cy.visit('/')
  cy.get('[data-cy=auth-page]').should('be.visible')
  cy.pauseE2ePace()
  cy.get('[data-cy=auth-tab-login]').click()
  cy.get('[data-cy=auth-heading]').should('contain.text', 'Log in')
  cy.pauseE2ePace()
  cy.get('[data-cy=auth-email]').clear()
  cy.get('[data-cy=auth-email]').type(email, { delay: d })
  cy.get('[data-cy=auth-password]').clear()
  cy.get('[data-cy=auth-password]').type(password, { delay: d })
  cy.pauseE2ePace()
  cy.get('[data-cy=auth-submit]').click()
})

declare global {
  namespace Cypress {
    interface Chainable {
      pauseE2ePace(): Chainable<void>
      waitForBlogsFeedReady(): Chainable<void>
      openHeaderAccountMenu(): Chainable<void>
      signOutThroughUi(): Chainable<void>
      openNotificationsPanel(): Chainable<void>
      fillAndPublishBlogPost(title: string, body: string): Chainable<void>
      expectBlogComposerClosed(): Chainable<void>
      signUpThroughUi(displayName: string, email: string, password: string): Chainable<void>
      logInThroughUi(email: string, password: string): Chainable<void>
    }
  }
}

export {}
