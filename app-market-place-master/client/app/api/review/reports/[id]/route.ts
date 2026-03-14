import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const route = "GET /api/review/reports/[id]";
  const start = Date.now();
  const { userId } = await auth();
  const id = (await params).id;
  logRequest(route, "GET", { id, userId: userId ?? undefined });
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
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.appReports).doc(id).get();
    if (!snap.exists) {
      logStep(route, "not_found", { id });
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const data = snap.data()!;
    const status = (data.status as string) ?? "pending";
    const report = {
      id: snap.id,
      appId: data.appId,
      appSlug: data.appSlug,
      reporterEmail: data.reporterEmail,
      reason: data.reason,
      status,
      createdAt: data.createdAt ?? null,
      resolvedAt: data.resolvedAt ?? null,
      resolvedBy: data.resolvedBy ?? null,
      resolutionNote: data.resolutionNote ?? null,
    };
    logResponse(route, 200, Date.now() - start, { id });
    return NextResponse.json(report);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to get report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
