import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CATEGORIES } from "@/lib/constants/categories";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(req: NextRequest) {
  const route = "GET /api/categories";
  const start = Date.now();
  logRequest(route, "GET", {});

  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    logResponse(route, 200, Date.now() - start, { count: DEFAULT_CATEGORIES.length });
    return NextResponse.json(DEFAULT_CATEGORIES);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
