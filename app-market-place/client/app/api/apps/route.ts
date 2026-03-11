import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { docToPublicApp } from "@/lib/public-app";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(req: NextRequest) {
  const route = "GET /api/apps";
  const start = Date.now();
  logRequest(route, "GET", {});

  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    const searchParams = req.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const db = getDb();
    const query = db.collection("apps").where("status", "==", "published");
    const snap = await query.get();
    let rows = snap.docs.map(docToPublicApp);

    if (categoryId?.trim()) {
      rows = rows.filter((r) => r.categoryId === categoryId);
    }
    if (search?.trim()) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.developer.toLowerCase().includes(lower) ||
          r.shortDescription.toLowerCase().includes(lower)
      );
    }
    logResponse(route, 200, Date.now() - start, { count: rows.length });
    return NextResponse.json(rows);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load apps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
