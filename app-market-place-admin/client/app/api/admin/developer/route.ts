import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET() {
  const route = "GET /api/admin/developer";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "GET", { userId: userId ?? undefined });
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
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(userId);
    let devSnap = await userRef.get();

    if (!devSnap.exists) {
      const now = Date.now();
      await userRef.set({
        userId,
        developerStatus: "pending_verification",
        trustScore: 50,
        strikeCount: 0,
        githubId: null,
        githubUsername: null,
        createdAt: now,
      });
      devSnap = await userRef.get();
    }

    const d = devSnap.data()!;
    logResponse(route, 200, Date.now() - start, {});
    return NextResponse.json({
      verified: d.developerStatus === "verified",
      developerStatus: d.developerStatus,
      githubUsername: d.githubUsername ?? null,
      trustScore: d.trustScore ?? 50,
      strikeCount: d.strikeCount ?? 0,
    });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load developer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
