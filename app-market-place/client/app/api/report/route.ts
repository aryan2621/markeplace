import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { validateReportBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  try {
    const body = await req.json();
    const validated = validateReportBody(body);
    if (!validated.ok) {
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
    return NextResponse.json({ message: "Thank you. We will review your report." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
