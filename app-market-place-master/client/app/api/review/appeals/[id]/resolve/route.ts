import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { writeAuditLog } from "@/lib/audit-log";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const route = "POST /api/review/appeals/[id]/resolve";
  const start = Date.now();
  const { userId } = await auth();
  const id = (await params).id;
  logRequest(route, "POST", { appealId: id, userId: userId ?? undefined });
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
    const upheld = body.upheld === true;
    const db = getDb();
    const ref = db.collection(COLLECTIONS.appAppeals).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      logStep(route, "not_found", { appealId: id });
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
    }
    const data = snap.data()!;
    if (data.status !== "pending") {
      logStep(route, "validation_failed", { reason: "already_resolved", appealId: id });
      return NextResponse.json({ error: "Appeal already resolved" }, { status: 400 });
    }
    await ref.update({
      status: upheld ? "upheld" : "rejected",
      resolvedBy: userId,
      resolvedAt: Date.now(),
    });
    await writeAuditLog({
      userId,
      action: "appeal.resolved",
      entityType: "appeal",
      entityId: id,
      oldValue: "pending",
      newValue: upheld ? "upheld" : "rejected",
    });
    logStep(route, "resolved", { appealId: id, upheld });
    logResponse(route, 200, Date.now() - start, { appealId: id, upheld });
    return NextResponse.json({ ok: true, upheld });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to resolve appeal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
