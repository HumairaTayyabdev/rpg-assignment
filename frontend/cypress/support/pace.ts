/// <reference types="cypress" />

export function e2ePaceMs(): number {
  const n = Number(Cypress.env('e2ePaceMs'))
  return Number.isFinite(n) && n >= 0 ? n : 850
}

export function e2eTypeDelayMs(): number {
  const n = Number(Cypress.env('e2eTypeDelayMs'))
  return Number.isFinite(n) && n >= 0 ? n : 40
}
