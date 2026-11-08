// Behind Vercel the proxy sets these headers for us. On a bare server they can be faked,
// so treat the IP as a hint for logging and rate limiting, not as identity.
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// Cheap CSRF guard for POST routes: the request has to come from our own origin.
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
