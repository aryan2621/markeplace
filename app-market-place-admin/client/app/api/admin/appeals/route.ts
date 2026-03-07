import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const body = await req.json();
    const appSlug = typeof body.appSlug === "string" ? body.appSlug.trim() : null;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!appSlug) {
      return NextResponse.json({ error: "appSlug required" }, { status: 400 });
    }
    const db = getDb();
    await db.collection(COLLECTIONS.appAppeals).add({
      appSlug,
      developerId: userId,
      reason: reason || "Appeal submitted.",
      status: "pending",
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true, message: "Appeal submitted." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit appeal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
