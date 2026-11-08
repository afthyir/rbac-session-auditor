# RBAC Session Auditor

A small Next.js app that shows how I'd handle access control properly: every request is checked against a Supabase login **and** a Redis session whitelist, three roles are enforced, and every denied attempt or session change lands in an audit log.

**Live demo:** https://auth.afthyir.co.uk &nbsp;·&nbsp; **Stack:** Next.js 15 (App Router), TypeScript, Tailwind, Supabase Auth, Redis

## What it does

- **Three roles:** Guest, Engineer, Admin. New accounts start as Guest.
- **Edge middleware** checks every request: clean the path, verify the Supabase JWT, look the session up in Redis, then check the role.
- **Instant revocation.** Sessions live in a Redis whitelist, so an admin can kick someone out (or change their role) and it applies on their next request, not when the token expires.
- **Audit log.** Logins, logouts, role changes, revocations and every denied request, shown in the admin panel as plain sentences, e.g. *"User 3f2a9c1d (guest) tried to open /admin from 203.0.113.7 - access denied"*.
- **BOLA protection.** `/api/users/:id` only returns your own profile unless you're an admin. "Not yours" and "doesn't exist" give the same 404.

## How a request flows

```
browser ──► middleware (Edge)
              1. clean the path (no ../, double encoding, etc.)
              2. verify the Supabase JWT (pinned algorithm, issuer, audience)
              3. is the session in the Redis whitelist?  ── no ──► 401 / 404
              4. does the role (from Redis) allow this route? ── no ──► 403 / 404
              5. forward verified identity headers
            ──► page or API route (checks again, see lib/auth.ts)
```

If Redis is unreachable the middleware answers 503. It never lets a request through because it couldn't check.

## Run it locally

You need Node 20+, Docker, and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/afthyir/rbac-session-auditor.git
cd rbac-session-auditor
npm install

cp .env.example .env.local     # then fill it in (see below)
npm run redis:up               # starts Redis + an HTTP gateway for it
```

1. In Supabase, open the SQL editor and run `supabase/schema.sql`.
2. Copy your project URL, anon key and service role key into `.env.local`. If your project uses the older JWT secret, add that too; otherwise leave it empty and the app uses the project's public keys.
3. Pick any long random values for `REDIS_PASSWORD` and `REDIS_REST_TOKEN` (`openssl rand -base64 32`). Make `REDIS_URL` use the same password.
4. For quick testing, turn off "Confirm email" in Supabase under Authentication > Providers > Email.

```bash
npm run dev
```

Open http://localhost:3000, create an account, then make yourself admin by running the commented `update` at the bottom of `supabase/schema.sql`. Sign out and back in.

## Deploy

Hosting is Vercel; Redis is [Upstash](https://upstash.com) (free tier). Add these in Vercel > Project > Settings > Environment Variables:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret, or leave empty on newer projects |
| `REDIS_URL` | Upstash TCP URL (starts with `rediss://`) |
| `REDIS_REST_URL`, `REDIS_REST_TOKEN` | Upstash REST URL and token |
| `SESSION_TTL_SECONDS` | Optional, defaults to 3600 |

Nothing secret is committed. `.env.local` is git-ignored and only `.env.example` (placeholders) is tracked.

## Project layout

```
src/
  middleware.ts          the gatekeeper
  lib/
    session-schema.ts    roles, Redis keys, audit event types
    verify-token.ts      Supabase JWT verification
    redis-edge.ts        Redis over HTTP (used by middleware)
    redis.ts             Redis over TCP (sessions, revoke, audit log)
    supabase-admin.ts    role lookups with the service role key
    auth.ts              second check for pages and API routes
    request.ts           client IP + same-origin check
  app/
    login/  dashboard/  engineer/  admin/
    api/auth/{session,logout}   start and end a session
    api/users/[id]              BOLA example
    api/admin/{audit,revoke,role}
supabase/schema.sql      profiles table + new-user trigger
docker-compose.yml       local Redis
```

## Known limits

- Sessions last as long as the Supabase access token (one hour by default) and there's no refresh flow, so you sign in again after that.
- The rate limiting is per IP and only counts denied requests. A production system would also want a CAPTCHA on sign-up.
- The Content Security Policy allows inline scripts because Next.js needs them without extra nonce setup.
- Roles are only changed through the admin panel or directly in Supabase.

## Why Next 15 and not 16?

Next.js 16 renamed `middleware.ts` to `proxy.ts` and moved it off the Edge runtime. This project deliberately uses Edge middleware, so it stays on 15.

MIT licensed.
