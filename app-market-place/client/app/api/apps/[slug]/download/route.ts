import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { getPresignedReadUrl } from "@/lib/filebase";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

const DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS = 600; // 10 minutes

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "GET /api/apps/[slug]/download";
  const start = Date.now();
  const slug = (await params).slug;
  logRequest(route, "GET", { slug });

  const rateLimitRes = await checkPublicRateLimit(req);
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
    const ref = db.collection("apps").doc(slug);
    const result = await db.runTransaction<
      { ok: true; downloadS3Key: string } | { ok: false; downloadS3Key: null }
    >(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data()?.status !== "published") {
        return { ok: false as const, downloadS3Key: null };
      }
      const data = snap.data()!;
      const key = (data.downloadS3Key as string)?.trim();
      if (!key) {
        return { ok: false as const, downloadS3Key: null };
      }
      const current = data.downloadCount;
      const num =
        typeof current === "number"
          ? current
          : parseInt(String(current ?? "0"), 10);
      const nextCount = Number.isNaN(num) ? 1 : num + 1;
      transaction.update(ref, { downloadCount: String(nextCount) });
      return { ok: true as const, downloadS3Key: key };
    });
    if (!result.ok || !result.downloadS3Key) {
      logStep(route, "not_found", { slug });
      return NextResponse.json(
        result.ok ? { error: "Download not available" } : { error: "Not found" },
        { status: 404 }
      );
    }
    let redirectUrl: string;
    try {
      redirectUrl = await getPresignedReadUrl(
        result.downloadS3Key,
        DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS
      );
    } catch (e) {
      logError(route, e, { status: 500, durationMs: Date.now() - start });
      return NextResponse.json(
        { error: "Download not available" },
        { status: 503 }
      );
    }
    logResponse(route, 302, Date.now() - start, { slug });
    return NextResponse.redirect(redirectUrl, 302);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to prepare download";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
