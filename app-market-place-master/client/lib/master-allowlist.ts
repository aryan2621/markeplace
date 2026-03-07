import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ALLOWED_EMAIL = "risha2621@gmail.com";
const GOOGLE_PROVIDERS = ["oauth_google", "google"];

/**
 * Ensures the current user is risha2621@gmail.com signed in via Google.
 * Returns 403 NextResponse if not allowed, null if allowed.
 */
export async function requireMasterUser(): Promise<NextResponse | null> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const hasGoogle = user.externalAccounts?.some((acc: { provider: string }) =>
    GOOGLE_PROVIDERS.includes(acc.provider)
  );
  if (primaryEmail !== ALLOWED_EMAIL || !hasGoogle) {
    return NextResponse.json(
      { error: "Forbidden. Access restricted to authorized reviewer." },
      { status: 403 }
    );
  }
  return null;
}
