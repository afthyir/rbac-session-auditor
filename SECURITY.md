# Security Policy

RBAC Session Auditor is a demo project about access control and session handling, so reports about it are welcome.

## Reporting a vulnerability

Please report it privately by email: **contact@afthyir.co.uk**

Include:

- What you found and where (route, request or file)
- Steps to reproduce it
- What an attacker could do with it

Please don't open a public issue or discussion for a live vulnerability until it's fixed.

You can expect a reply within a few days. Once it's fixed I'm happy to credit you if you'd like.

## Scope

In scope:

- Reaching `/admin` or `/engineer` without the right role
- Reading or changing another user's data (BOLA)
- Using a session after it has been revoked
- Forging or re-using tokens, or spoofing identity headers
- Bypassing the middleware checks

Out of scope:

- Denial of service or load testing against the live demo
- Social engineering or phishing
- Issues already listed under "Limits" in the README (no refresh flow, rate limiting only counts denied requests, CSP allows inline scripts)
- Findings in third-party services (Supabase, Redis hosting, Vercel)

## Supported versions

Only the latest version on `main` is supported.
