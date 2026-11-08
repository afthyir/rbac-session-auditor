# RBAC Session Auditor

Role-based access control for Next.js, done the careful way. Every request is checked against a Supabase login **and** a Redis session whitelist, three roles are enforced, and every denied attempt or session change lands in an audit log.

**Live demo:** https://auth.afthyir.co.uk

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind, Supabase Auth, Redis

## What it shows

- **Three roles** (Guest, Engineer, Admin) enforced in Edge middleware, not in client-side code.
- **Instant revocation.** Sessions sit in a Redis whitelist, so a valid-looking token stops working the moment its session is revoked.
- **Live role changes.** The role is read from Redis on every request, so an admin's change applies on the user's next click.
- **Audit log.** Logins, logouts, role changes, revocations and every denied request, written as plain sentences, e.g. *"User 3f2a9c1d (guest) tried to open /admin from 203.0.113.7 - access denied"*.
- **BOLA protection.** `/api/users/:id` only returns your own profile unless you're an admin, and "not yours" looks identical to "doesn't exist".

## How a request flows

```
browser ──► middleware (Edge)
              1. clean the path (no ../, double encoding, etc.)
              2. verify the Supabase JWT (pinned algorithm, issuer, audience)
              3. is the session in the Redis whitelist?   no ──► 401 / 404
              4. does the role (from Redis) allow it?     no ──► 403 / 404
              5. forward verified identity headers
            ──► page or API route (checks again, see lib/auth.ts)
```

## Security choices

- **Default deny.** Any route not on the public list needs a session.
- **Fail closed.** If Redis can't be reached, the answer is 503, never "let them through".
- **Pinned JWT algorithms**, with issuer and audience checked, so forged or re-purposed tokens fail.
- **Hidden routes.** `/admin` and `/engineer` return 404 to people without access, so they can't tell the pages exist.
- **No trusting the client.** Identity headers sent by the browser are stripped before the verified ones are added. Roles come from the database, never from the request.
- **Second check inside the app.** Pages and API routes verify the session again, in case the middleware is ever bypassed.
- **Tokens stay out of JavaScript.** The session token lives in an httpOnly cookie, and state-changing routes check the request origin.
- **Rate limiting** on repeated denied requests, per IP.
- **No stack traces or failure reasons** in responses, and no secrets in the repo.

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
    api/auth/{session,logout}
    api/users/[id]       BOLA example
    api/admin/{audit,revoke,role}
supabase/schema.sql      profiles table + new-user trigger
docker-compose.yml       local Redis
```

## Run it yourself

You'll need Node 20+, Docker and a Supabase project.

```bash
npm install
cp .env.example .env.local   # fill in the placeholders
npm run redis:up
npm run dev
```

Run `supabase/schema.sql` in your Supabase SQL editor first. Everything the app reads from the environment is listed, with comments, in `.env.example`.

## Limits

- Sessions last as long as the Supabase access token (an hour by default) and there is no refresh flow.
- Rate limiting only counts denied requests. A real deployment would add a CAPTCHA on sign-up.
- The CSP allows inline scripts, because Next.js needs them without extra nonce setup.
- It stays on Next.js 15 on purpose: version 16 moved middleware off the Edge runtime.

MIT licensed.
