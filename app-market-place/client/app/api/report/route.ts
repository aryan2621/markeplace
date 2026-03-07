import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  try {
    const body = await req.json();
    const appId = typeof body.appId === "string" ? body.appId : undefined;
    const appSlug = typeof body.appSlug === "string" ? body.appSlug : undefined;
    if (!appId || !appSlug) {
      return NextResponse.json(
        { error: "appId and appSlug required" },
        { status: 400 }
      );
    }
    const db = getDb();
    await db.collection("appReports").add({
      appId,
      appSlug,
      reporterEmail: typeof body.reporterEmail === "string" ? body.reporterEmail : undefined,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      status: "pending",
    });
    return NextResponse.json({ message: "Thank you. We will review your report." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
