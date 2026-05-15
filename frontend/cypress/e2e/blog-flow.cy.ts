describe('Blogs: login, posts, publish, notifications', () => {
  const unique = Date.now()
  const email = `e2e-${unique}@example.test`
  const password = 'E2Esecure1a'
  const displayName = `E2E User ${unique}`
  const postTitle = `Cypress post ${unique}`

  beforeEach(() => {
    cy.clearAllLocalStorage()
  })

  it('signs up, logs out, logs in, publishes, and opens a notification', () => {
    cy.signUpThroughUi(displayName, email, password)
    cy.location('pathname', { timeout: 30000 }).should('eq', '/blogs')
    cy.get('[data-cy=blogs-root]', { timeout: 30000 }).should('be.visible')
    cy.waitForBlogsFeedReady()
    cy.pauseE2ePace()

    cy.signOutThroughUi()
    cy.location('pathname', { timeout: 15000 }).should('eq', '/')
    cy.get('[data-cy=auth-page]', { timeout: 15000 }).should('be.visible')
    cy.pauseE2ePace()

    cy.logInThroughUi(email, password)
    cy.location('pathname', { timeout: 30000 }).should('eq', '/blogs')
    cy.get('[data-cy=blogs-root]', { timeout: 30000 }).should('be.visible')
    cy.waitForBlogsFeedReady()
    cy.pauseE2ePace()

    cy.get('[data-cy=blogs-root]')
      .contains('button', 'Create new blog')
      .scrollIntoView()
      .should('be.visible')
      .click()
    cy.pauseE2ePace()

    cy.fillAndPublishBlogPost(postTitle, 'Body from Cypress e2e.')
    cy.expectBlogComposerClosed()
    cy.pauseE2ePace()

    cy.get('[data-cy=blogs-root]', { timeout: 30000 }).should('contain.text', postTitle)
    cy.pauseE2ePace()

    cy.openNotificationsPanel()
    cy.get('[data-cy=notif-panel]').should('be.visible')
    cy.contains('.notif-title', 'Signal desk').should('be.visible')
    cy.pauseE2ePace()

    cy.get('[data-cy=notif-item]', { timeout: 25000 }).should('have.length.at.least', 1)
    cy.get('[data-cy=notif-item]').first().click()

    cy.get('[data-cy=post-preview]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-cy=post-preview]').should('contain.text', postTitle)
    cy.get('[data-cy=post-preview]').should('contain.text', 'Body from Cypress e2e.')
  })
})
