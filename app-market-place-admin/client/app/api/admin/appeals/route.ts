import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug, validateAppealReason } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(req: NextRequest) {
  const route = "POST /api/admin/appeals";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "POST", { userId: userId ?? undefined });
  if (!userId) {
    logStep(route, "auth_failed", { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    const body = await req.json();
    const appSlugRaw = typeof body.appSlug === "string" ? body.appSlug.trim() : "";
    const slugValidation = validateSlug(appSlugRaw);
    if (!slugValidation.ok) {
      logStep(route, "validation_failed", { reason: slugValidation.error });
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    const reasonValidation = validateAppealReason(body.reason);
    if (!reasonValidation.ok) {
      logStep(route, "validation_failed", { reason: reasonValidation.error });
      return NextResponse.json({ error: reasonValidation.error }, { status: 400 });
    }
    const db = getDb();
    const appSnap = await db.collection(COLLECTIONS.apps).doc(appSlugRaw).get();
    if (!appSnap.exists) {
      logStep(route, "not_found", { appSlug: appSlugRaw });
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    if (appSnap.data()?.developerId !== userId) {
      logStep(route, "forbidden", { appSlug: appSlugRaw });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db.collection(COLLECTIONS.appAppeals).add({
      appSlug: appSlugRaw,
      developerId: userId,
      reason: reasonValidation.value,
      status: "pending",
      createdAt: Date.now(),
    });
    logStep(route, "appeal_submitted", { appSlug: appSlugRaw });
    logResponse(route, 200, Date.now() - start, { appSlug: appSlugRaw });
    return NextResponse.json({ ok: true, message: "Appeal submitted." });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to submit appeal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
