import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { DEFAULT_CATEGORIES } from "@/lib/constants/categories";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET() {
  const route = "GET /api/admin/categories";
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
    logResponse(route, 200, Date.now() - start, { count: DEFAULT_CATEGORIES.length });
    return NextResponse.json(DEFAULT_CATEGORIES);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
