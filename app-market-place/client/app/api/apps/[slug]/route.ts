import { NextRequest, NextResponse } from "next/server";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { fetchAppBySlug } from "@/lib/cached-apps";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "GET /api/apps/[slug]";
  const start = Date.now();
  const slug = (await params).slug;
  logRequest(route, "GET", { slug });

  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  const slugValidation = validateSlug(slug ?? "");
  if (!slugValidation.ok) {
    logStep(route, "validation_failed", { reason: slugValidation.error, slug });
    return NextResponse.json({ error: slugValidation.error }, { status: 400 });
  }
  try {
    const result = await fetchAppBySlug(slug);
    if (!result) {
      logStep(route, "not_found", { slug });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json(result);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
