import { NextRequest, NextResponse } from "next/server";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { fetchAppList } from "@/lib/cached-apps";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

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
    const categoryId = searchParams.get("categoryId")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const limitParam = searchParams.get("limit");
    const limit = Math.min(
      Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const cursor = searchParams.get("cursor") ?? undefined;

    const params = { categoryId, search, limit, cursor };
    const { apps, nextCursor } = await fetchAppList(params);

    logResponse(route, 200, Date.now() - start, { count: apps.length });
    return NextResponse.json({ apps, nextCursor });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load apps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
