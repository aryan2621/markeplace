import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  buildGitHubVerifyAuthorizeUrl,
  isAuth0GitHubConfigured,
} from "@/lib/auth0-github-verify";

/**
 * Clerk-protected. Redirects the current user to Auth0 (GitHub connection) to verify developer.
 * After Auth0 callback, Firestore is updated and user is marked verified.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  if (!isAuth0GitHubConfigured()) {
    return NextResponse.redirect(
      new URL("/apps?error=github_verify_not_configured", req.url)
    );
  }
  const url = new URL(req.url);
  const origin = url.origin;
  const authUrl = buildGitHubVerifyAuthorizeUrl(userId, origin);
  return NextResponse.redirect(authUrl);
}
