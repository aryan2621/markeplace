import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { validateReportBody } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(req: NextRequest) {
  const route = "POST /api/report";
  const start = Date.now();
  logRequest(route, "POST", {});

  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logStep(route, "validation_failed", { reason: "invalid_body" });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const validated = validateReportBody(body);
    if (!validated.ok) {
      logStep(route, "validation_failed", { reason: validated.error });
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const db = getDb();
    await db.collection("appReports").add({
      appId: validated.appId,
      appSlug: validated.appSlug,
      reporterEmail: validated.reporterEmail ?? null,
      reason: validated.reason ?? null,
      status: "pending",
      createdAt: Date.now(),
    });
    logStep(route, "report_saved", { appSlug: validated.appSlug });
    logResponse(route, 200, Date.now() - start, {});
    return NextResponse.json({ message: "Thank you. We will review your report." });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to submit report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
