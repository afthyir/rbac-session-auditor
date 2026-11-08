import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { isUuid } from "./session-schema";

// Verifies a Supabase access token. Works on both Edge and Node.

export interface VerifiedToken {
  sub: string; // user id
  sid: string; // Supabase session id, also our Redis key
  exp: number;
}

let jwks: JWTVerifyGetKey | null = null;
let hmacKey: Uint8Array | null = null;

export async function verifyAccessToken(token: string): Promise<VerifiedToken | null> {
  if (typeof token !== "string" || token.length === 0 || token.length > 4096) return null;

  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null; // not configured -> nobody gets in

  const issuer = `${base}/auth/v1`;
  const secret = process.env.SUPABASE_JWT_SECRET;
  const useSecret = !!secret && !secret.startsWith("replace-with");

  const opts = {
    issuer,
    audience: "authenticated",
    clockTolerance: 5,
    requiredClaims: ["sub", "exp", "session_id"],
  };

  try {
    // Algorithms are pinned on purpose: trusting the token's own "alg" header
    // is how algorithm-confusion attacks work.
    const { payload } = useSecret
      ? await jwtVerify(token, (hmacKey ??= new TextEncoder().encode(secret)), {
          ...opts,
          algorithms: ["HS256"],
        })
      : await jwtVerify(
          token,
          (jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
            timeoutDuration: 1500,
            cooldownDuration: 30_000,
          })),
          { ...opts, algorithms: ["ES256", "RS256"] },
        );

    const sid = (payload as { session_id?: unknown }).session_id;
    if (!isUuid(payload.sub) || !isUuid(sid) || typeof payload.exp !== "number") return null;

    return { sub: payload.sub.toLowerCase(), sid: sid.toLowerCase(), exp: payload.exp };
  } catch {
    // Expired, bad signature, wrong issuer... the caller only needs to know "no".
    return null;
  }
}
