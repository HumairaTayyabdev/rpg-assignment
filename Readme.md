# RPG Blogs

A full-stack blogging app with user authentication, plain-text posts, and real-time notifications when anyone publishes. Built on the RPG assignment starter: **Vue 3**, **NestJS**, **GraphQL**, **PostgreSQL**, and **Redis**.

## Features

**Authentication** | Sign up and log in; JWT stored in the browser; protected `/blogs` route |
**Blog posts** | Create, edit, and delete your own posts; browse all posts or “My blogs” |
**Real-time updates** | GraphQL subscription (`blogPublished`) updates the feed and toasts without reload |
**Notifications** | In-app “Signal desk” panel; unread badge; open a post from a notification |

## Tech stack

Frontend | Vue 3, Vite, Vue Router, Apollo Client, GraphQL WS |
Backend | NestJS, Apollo GraphQL, TypeORM, class-validator |
Database | PostgreSQL 16 |
Pub/sub | Redis (subscriptions); in-memory fallback when `REDIS_DISABLED=true` |

## Prerequisites

**Node.js** 20.19+ or 22.12+ (frontend `engines`)
**npm** (or yarn) in `backend/` and `frontend/`
**Docker** (recommended) for PostgreSQL and Redis, or local installs on ports `5432` and `6379`

## Quick start

### 1. Start PostgreSQL and Redis

From the repository root:

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432` (`rpg_user` / `rpg_password` / `rpg_blog`)
- Redis on `localhost:6379`

### 2. Configure and run the backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

- GraphQL HTTP: [http://localhost:3200/graphql](http://localhost:3200/graphql)
- GraphQL WebSocket: `ws://localhost:3200/graphql-ws`

See [backend/README.md](./backend/README.md) for API details, tests, and environment variables.

### 3. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

See [frontend/README.md](./frontend/README.md) for build, lint, and Cypress E2E tests.

## Root scripts

From the repository root (after `npm install` in `backend` and `frontend`):

`npm run lint` | ESLint with auto-fix (backend + frontend) |
`npm run lint:check` | ESLint without fix (CI-friendly) |
`npm run e2e` | Cypress headless (frontend) |
`npm run e2e:chrome` | Cypress in Chrome |

E2E tests need **backend** and **frontend** running. See [frontend/README.md](./frontend/README.md#end-to-end-tests-cypress).
