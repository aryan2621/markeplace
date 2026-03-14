/**
 * Minimal Auth0 OAuth helpers used only for "Verify with GitHub" (developer verification).
 * Clerk remains the main auth provider.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID!;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET!;
const AUTH0_SECRET = process.env.AUTH0_SECRET!;

export function isAuth0GitHubConfigured(): boolean {
  return Boolean(
    AUTH0_DOMAIN && AUTH0_CLIENT_ID && AUTH0_CLIENT_SECRET && AUTH0_SECRET
  );
}

function getRedirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/auth/github-callback`;
}

export function buildGitHubVerifyAuthorizeUrl(
  clerkUserId: string,
  appBaseUrl: string
): string {
  const state = createSignedState(clerkUserId);
  const redirectUri = getRedirectUri(appBaseUrl);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: AUTH0_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "openid profile",
    state,
    connection: "github",
  });
  const domain = AUTH0_DOMAIN.startsWith("http")
    ? AUTH0_DOMAIN
    : `https://${AUTH0_DOMAIN}`;
  return `${domain}/authorize?${params.toString()}`;
}

function createSignedState(clerkUserId: string): string {
  const payload = Buffer.from(clerkUserId, "utf8").toString("base64url");
  const sig = createHmac("sha256", AUTH0_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAndDecodeState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = createHmac("sha256", AUTH0_SECRET).update(payload).digest("base64url");
  try {
    const sigBuf = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export async function exchangeCodeForGitHubUser(
  code: string,
  appBaseUrl: string
): Promise<{ sub: string; name?: string; nickname?: string } | null> {
  const redirectUri = getRedirectUri(appBaseUrl);
  const domain = AUTH0_DOMAIN.startsWith("http")
    ? AUTH0_DOMAIN
    : `https://${AUTH0_DOMAIN}`;

  const tokenRes = await fetch(`${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return null;
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) return null;

  const userRes = await fetch(`${domain}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return null;
  const user = (await userRes.json()) as {
    sub?: string;
    name?: string;
    nickname?: string;
  };
  if (!user?.sub) return null;
  return {
    sub: user.sub,
    name: user.name,
    nickname: user.nickname,
  };
}
