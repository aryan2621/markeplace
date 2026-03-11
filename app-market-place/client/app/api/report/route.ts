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
    const body = await req.json();
    const validated = validateReportBody(body);
    if (!validated.ok) {
      logStep(route, "validation_failed", { reason: validated.error });
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const db = getDb();
    await db.collection("appReports").add({
      appId: validated.appId,
      appSlug: validated.appSlug,
      reporterEmail: validated.reporterEmail,
      reason: validated.reason,
      status: "pending",
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
