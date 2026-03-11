import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(_req: NextRequest) {
  const route = "GET /api/review/appeals";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "GET", { userId: userId ?? undefined });
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
    const col = db.collection(COLLECTIONS.appAppeals);
    const snap = await col.where("status", "==", "pending").get();
    const appeals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    logResponse(route, 200, Date.now() - start, { count: appeals.length });
    return NextResponse.json(appeals);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load appeals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
