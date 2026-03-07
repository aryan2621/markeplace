import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/firestore-collections";
import {
  exchangeCodeForGitHubUser,
  isAuth0GitHubConfigured,
  verifyAndDecodeState,
} from "@/lib/auth0-github-verify";

/**
 * Public route (Auth0 redirects here). Exchanges code for user, updates Firestore for the
 * Clerk user id stored in state, then redirects back to app.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = url.origin;
  const redirectBase = new URL("/apps", origin);

  if (!code || !state || !isAuth0GitHubConfigured()) {
    redirectBase.searchParams.set("error", "github_verify_failed");
    return NextResponse.redirect(redirectBase);
  }

  const clerkUserId = verifyAndDecodeState(state);
  if (!clerkUserId) {
    redirectBase.searchParams.set("error", "github_verify_invalid_state");
    return NextResponse.redirect(redirectBase);
  }

  const githubUser = await exchangeCodeForGitHubUser(code, origin);
  if (!githubUser) {
    redirectBase.searchParams.set("error", "github_verify_exchange_failed");
    return NextResponse.redirect(redirectBase);
  }

  const db = getDb();
  const userRef = db.collection(COLLECTIONS.users).doc(clerkUserId);
  const devSnap = await userRef.get();
  const now = Date.now();

  if (!devSnap.exists) {
    await userRef.set({
      userId: clerkUserId,
      developerStatus: "verified",
      trustScore: 50,
      strikeCount: 0,
      githubId: githubUser.sub,
      githubUsername: githubUser.nickname ?? githubUser.name ?? null,
      createdAt: now,
    });
  } else {
    await userRef.update({
      developerStatus: "verified",
      githubId: githubUser.sub,
      githubUsername: githubUser.nickname ?? githubUser.name ?? null,
    });
  }

  redirectBase.searchParams.set("verified", "github");
  return NextResponse.redirect(redirectBase);
}
