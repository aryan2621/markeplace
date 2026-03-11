import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

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
    const result = await db.runTransaction<{ ok: true; fileUrl: string } | { ok: false; fileUrl: null }>(
      async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists || snap.data()?.status !== "published") {
          return { ok: false as const, fileUrl: null };
        }
        const data = snap.data()!;
        const fileUrl = data.downloadUrl?.trim();
        if (!fileUrl) {
          return { ok: false as const, fileUrl: null };
        }
        const current = data.downloadCount;
        const num =
          typeof current === "number"
            ? current
            : parseInt(String(current ?? "0"), 10);
        const nextCount = Number.isNaN(num) ? 1 : num + 1;
        transaction.update(ref, { downloadCount: String(nextCount) });
        return { ok: true as const, fileUrl };
      }
    );
    if (!result.ok || !result.fileUrl) {
      logStep(route, "not_found", { slug });
      return NextResponse.json(
        result.ok ? { error: "Download not available" } : { error: "Not found" },
        { status: 404 }
      );
    }
    logResponse(route, 302, Date.now() - start, { slug });
    return NextResponse.redirect(result.fileUrl, 302);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to prepare download";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
