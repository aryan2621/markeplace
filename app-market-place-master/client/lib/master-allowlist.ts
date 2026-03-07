import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const GOOGLE_PROVIDERS = ["oauth_google", "google"];

/**
 * Ensures the current user is the allowed master reviewer (MASTER_ALLOWED_EMAIL) signed in via Google.
 * Returns 403 NextResponse if not allowed, null if allowed.
 * Set MASTER_ALLOWED_EMAIL in env to the reviewer's email; if unset, no one is allowed.
 */
export async function requireMasterUser(): Promise<NextResponse | null> {
  const allowedEmail = process.env.MASTER_ALLOWED_EMAIL?.trim();
  if (!allowedEmail) {
    return NextResponse.json(
      { error: "Forbidden. Access restricted to authorized reviewer." },
      { status: 403 }
    );
  }
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const hasGoogle = user.externalAccounts?.some((acc: { provider: string }) =>
    GOOGLE_PROVIDERS.includes(acc.provider)
  );
  if (primaryEmail !== allowedEmail || !hasGoogle) {
    return NextResponse.json(
      { error: "Forbidden. Access restricted to authorized reviewer." },
      { status: 403 }
    );
  }
  return null;
}
