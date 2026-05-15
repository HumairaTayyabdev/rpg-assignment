# RPG Blogs — Frontend

Vue 3 single-page app: sign up / log in, browse and manage blog posts, and receive real-time notifications via GraphQL subscriptions.

## Requirements

- Node.js **^20.19.0** or **>=22.12.0**
- Backend running at `http://localhost:3200` (see [backend/README.md](../backend/README.md))

## Setup

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

### Environment variables

Optional Vite env (`.env` or `.env.local`):

`VITE_GRAPHQL_URL` | `http://localhost:3200/graphql` | GraphQL HTTP endpoint |
`VITE_GRAPHQL_WS_URL` | derived from HTTP URL | WebSocket subscriptions |

Types: [`env.d.ts`](./env.d.ts).

## Scripts

`npm run dev` | Vite dev server with HMR |
`npm run lint` | ESLint with fix |
`npm run lint:check` | ESLint, no fix |
`npm run e2e` | Cypress headless |
`npm run e2e:chrome` | Cypress in Chrome |
`npm run e2e:open` | Cypress interactive UI |
`npm run e2e:open:chrome` | Cypress UI in Chrome |

From repo root: `npm run e2e:chrome` runs the frontend E2E suite.

## Routes

`/` | Public | Sign up / log in |
`/blogs` | Authenticated | Feed, create/edit/delete, notifications |
`/about` | Public | Static about page |

Auth token is stored in `localStorage` (`authToken`, `authUser`). Router guard redirects unauthenticated users from `/blogs` to `/`.

## Apollo Client

- **HTTP** for queries and mutations (Bearer token via `auth-storage`).
- **WebSocket** (`graphql-ws`) for `blogPublished` subscription.
- Config: [`src/apollo/client.ts`](./src/apollo/client.ts).

## End-to-end tests (Cypress)

Full-stack UI tests against a running dev server and API (no mocks).

### Prerequisites

1. `docker compose up -d` (Postgres + Redis)
2. Backend: `cd backend && npm run start:dev`
3. Frontend: `cd frontend && npm run dev`

### Run

```bash
cd frontend
npm run e2e:chrome
npm run e2e:open:chrome
```

Override app URL:

```bash
CYPRESS_BASE_URL=http://127.0.0.1:5173 npm run e2e
```

### Specs

`cypress/e2e/home.cy.ts` | Auth landing, sign up / log in tabs |
`cypress/e2e/routing.cy.ts` | `/blogs` guard, `/about` |
`cypress/e2e/blog-flow.cy.ts` | Sign up → sign out → log in → create post → notifications |

### Custom commands

Defined in [`cypress/support/commands.ts`](./cypress/support/commands.ts):

- `cy.signUpThroughUi(name, email, password)`
- `cy.logInThroughUi(email, password)`
- `cy.waitForBlogsFeedReady()` — waits for “All blogs” / “My blogs” tabs
- `cy.signOutThroughUi()`
- `cy.fillAndPublishBlogPost(title, body)`
- `cy.openNotificationsPanel()`
- `cy.pauseE2ePace()` — demo pacing between steps

### Demo pacing

In [`cypress.config.ts`](./cypress.config.ts):

```ts
env: {
  e2ePaceMs: 850,
  e2eTypeDelayMs: 40,
}
```

Override locally with `cypress.env.json` (not committed):

```json
{
  "e2ePaceMs": 1400,
  "e2eTypeDelayMs": 70
}
```

### `data-cy` selectors

Stable hooks for tests include `auth-page`, `blogs-root`, `blogs-create`, `blog-modal-title`, `header-notifications-btn`, `notif-panel`, etc. Commands also use `aria-label` and visible text where `data-cy` may be missing in a stale dev bundle—**restart `npm run dev`** after pulling UI changes.

## Linting & format

```bash
npm run lint
npm run lint:check
npm run format
```

## Build for production

```bash
npm run build
npm run preview
```

Serve `dist/` behind a static host; set `VITE_GRAPHQL_URL` / `VITE_GRAPHQL_WS_URL` to your deployed API.
