import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { getPresignedReadUrl } from "@/lib/filebase";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug, validateDownloadKey } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

const DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS = 180; // 3 minutes

/**
 * Master-only download: serves APK for any app (including in review).
 * Does not increment downloadCount. Protected by requireMasterUser.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "GET /api/review/apps/[slug]/download";
  const start = Date.now();
  const { userId } = await auth();
  const slug = (await params).slug;
  logRequest(route, "GET", { slug, userId: userId ?? undefined });

  if (!userId) {
    logStep(route, "auth_failed", { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowRes = await requireMasterUser();
  if (allowRes) {
    logStep(route, "auth_failed", { status: 403 });
    return allowRes;
  }
  const rateLimitRes = await checkMasterRateLimit(userId);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  const slugValidation = validateSlug(slug ?? "");
  if (!slugValidation.ok) {
    logStep(route, "validation_failed", { reason: slugValidation.error, slug });
    return NextResponse.json({ error: slugValidation.error }, { status: 400 });
  }
  try {
    const db = getDb();
    const appSnap = await db.collection(COLLECTIONS.apps).doc(slug).get();
    if (!appSnap.exists) {
      logStep(route, "not_found", { slug });
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    const key = (appSnap.data()?.downloadS3Key as string)?.trim();
    if (!key) {
      logStep(route, "no_download", { slug });
      return NextResponse.json(
        { error: "Download not available for this app" },
        { status: 404 }
      );
    }
    const keyValidation = validateDownloadKey(key);
    if (!keyValidation.ok) {
      logStep(route, "validation_failed", { reason: keyValidation.error, slug });
      return NextResponse.json(
        { error: "Download not available for this app" },
        { status: 404 }
      );
    }
    const redirectUrl = await getPresignedReadUrl(
      key,
      DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS
    );
    logResponse(route, 302, Date.now() - start, { slug });
    return NextResponse.redirect(redirectUrl, 302);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message =
      e instanceof Error ? e.message : "Failed to prepare download";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
