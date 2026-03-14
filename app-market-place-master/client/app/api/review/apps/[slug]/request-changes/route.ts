import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug, REJECT_FEEDBACK_MAX_LENGTH } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit-log";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "POST /api/review/apps/[slug]/request-changes";
  const start = Date.now();
  const { userId } = await auth();
  const slug = (await params).slug;
  logRequest(route, "POST", { slug, userId: userId ?? undefined });
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
    const body = await req.json().catch(() => ({}));
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "Please make the requested changes and resubmit.";
    if (feedback.length > REJECT_FEEDBACK_MAX_LENGTH) {
      logStep(route, "validation_failed", { reason: "feedback_too_long" });
      return NextResponse.json(
        { error: `feedback must be at most ${REJECT_FEEDBACK_MAX_LENGTH} characters` },
        { status: 400 }
      );
    }
    const db = getDb();
    const ref = db.collection(COLLECTIONS.apps).doc(slug);
    const snap = await ref.get();
    if (!snap.exists) {
      logStep(route, "not_found", { slug });
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    const data = snap.data()!;
    const status = data.status as string;
    if (status !== "in_review" && status !== "pending_review") {
      logStep(route, "bad_status", { slug, status });
      return NextResponse.json({ error: "App is not in review" }, { status: 400 });
    }
    await ref.update({ reviewNotes: feedback, status: "draft" });
    await writeAuditLog({
      userId,
      action: "app.request_changes",
      entityType: "app",
      entityId: slug,
      oldValue: status,
      newValue: "draft",
    });
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to request changes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
