import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { docToPublicApp } from "@/lib/public-app";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(req: NextRequest) {
  const route = "GET /api/apps/featured";
  const start = Date.now();
  logRequest(route, "GET", {});

  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    const db = getDb();
    const snap = await db
      .collection("apps")
      .where("status", "==", "published")
      .get();
    const withOrder = snap.docs
      .map((doc) => ({ doc, data: doc.data() }))
      .filter(({ data }) => data.featuredOrder != null)
      .sort((a, b) => (a.data.featuredOrder ?? 0) - (b.data.featuredOrder ?? 0))
      .map(({ doc }) => docToPublicApp(doc));
    logResponse(route, 200, Date.now() - start, { count: withOrder.length });
    return NextResponse.json(withOrder);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load featured apps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
