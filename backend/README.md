# RPG Blogs — Backend

NestJS GraphQL API with PostgreSQL persistence, JWT authentication, and Redis-backed GraphQL subscriptions for live blog publishes.

## Requirements

- Node.js 20+
- PostgreSQL (see root `docker-compose.yml`)
- Redis for production-like subscriptions (optional in tests via `REDIS_DISABLED`)

## Setup

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env`:

`PORT` | HTTP port (default `3200`) |
`FRONTEND_ORIGIN` | CORS origin (default `http://localhost:5173`) |
`DB_*` | PostgreSQL connection (match `docker-compose.yml`) |
`TYPEORM_SYNCHRONIZE` | `true` in dev auto-creates tables; use migrations in production |
`AUTH_TOKEN_SECRET` | **Required** — secret for signing JWTs |
`REDIS_HOST` / `REDIS_PORT` | Redis for pub/sub |
`REDIS_DISABLED` | `true` → in-memory pub/sub (unit tests, no Redis) |

Start the API:

```bash
npm run start:dev
```

GraphQL playground / HTTP: `http://localhost:3200/graphql`  
WebSocket subscriptions: `ws://localhost:3200/graphql-ws`

## Scripts

`npm run start:dev` | Watch mode |
`npm run build` | Compile to `dist/` |
`npm run start:prod` | Run compiled `dist/main` |
`npm run test` | Jest unit tests (`src/**/__tests__/*.spec.ts`) |
`npm run test:e2e` | E2E tests (`test/`) |
`npm run lint` | ESLint with fix |
`npm run lint:check` | ESLint, no fix, max warnings 0 |

Unit tests live next to features under `__tests__/` (e.g. `src/auth/__tests__/auth.service.spec.ts`).

## GraphQL API (overview)

### Queries

`sayHello` | No | Starter hello world |
`me` | Bearer token | Current user |
`allBlogPosts` | Bearer | Paginated feed of posts |
`myNotifications` | Bearer | Notification list for current user |

### Mutations

`signUp` | No | Register; returns `token` + `user` |
`logIn` | No | Login; returns `token` + `user` |
`createPost` | Bearer | Create post; triggers notifications + subscription |
`updatePost` | Bearer | Update own post |
`deletePost` | Bearer | Delete own post |
`markAllNotificationsRead` | Bearer | Mark all notifications read |

### Subscriptions

`blogPublished` | Fired when any user publishes; payload includes `post` and `authorName` |

Send `Authorization: Bearer <token>` on HTTP and in WebSocket `connectionParams` for protected operations.

Full schema: [`src/schema.gql`](./src/schema.gql) (code-first; regenerated on build).

## Authentication

- Passwords hashed with **scrypt** (salt + hash stored in `users.password_hash`).
- **JWT** in `Authorization: Bearer …` header.
- `GqlAuthGuard` resolves the user and attaches it to the request for blog mutations.

## Blog & notifications

- **Posts** stored in PostgreSQL via TypeORM (`blog_posts`).
- On **create**, a transaction inserts per-user **notifications** (author’s copy marked read).
- **Pub/sub** publishes `BLOG_PUBLISHED_EVENT` so subscribed clients update immediately.
- Redis (`graphql-redis-subscriptions`) shares events across instances; set `REDIS_DISABLED=true` for in-memory only.

## Docker (from repo root)

```bash
docker compose up -d
```

Uses `postgres:16-alpine` and `redis:7-alpine` with credentials matching `.env.example`.

## Testing

```bash
npm test

npm run test:cov
```

Tests use `src/test-setup.ts` and mock repositories where appropriate.

## Linting

```bash
npm run lint
npm run lint:check
```

From repo root: `npm run lint:check --prefix backend`.
