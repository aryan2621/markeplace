import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const route = "POST /api/review/reports/[id]/resolve";
  const start = Date.now();
  const { userId } = await auth();
  const id = (await params).id;
  logRequest(route, "POST", { id, userId: userId ?? undefined });
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
  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    if (action !== "resolved" && action !== "dismissed") {
      logStep(route, "validation_failed", { reason: "invalid_action" });
      return NextResponse.json(
        { error: "action must be 'resolved' or 'dismissed'" },
        { status: 400 }
      );
    }
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : undefined;

    const db = getDb();
    const ref = db.collection(COLLECTIONS.appReports).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      logStep(route, "not_found", { id });
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const data = snap.data()!;
    const currentStatus = (data.status as string) ?? "pending";
    if (currentStatus !== "pending") {
      logStep(route, "validation_failed", { reason: "already_resolved", id });
      return NextResponse.json({ error: "Report already resolved or dismissed" }, { status: 400 });
    }

    const resolvedAt = Date.now();
    await ref.update({
      status: action,
      resolvedAt,
      resolvedBy: userId,
      resolutionNote: note ?? null,
    });

    logStep(route, "resolved", { id, action });
    logResponse(route, 200, Date.now() - start, { id });
    return NextResponse.json({ ok: true, status: action, resolvedAt });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to resolve report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
