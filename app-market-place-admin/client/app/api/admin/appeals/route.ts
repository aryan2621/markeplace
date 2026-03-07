import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug, validateAppealReason } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const body = await req.json();
    const appSlugRaw = typeof body.appSlug === "string" ? body.appSlug.trim() : "";
    const slugValidation = validateSlug(appSlugRaw);
    if (!slugValidation.ok) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    const reasonValidation = validateAppealReason(body.reason);
    if (!reasonValidation.ok) {
      return NextResponse.json({ error: reasonValidation.error }, { status: 400 });
    }
    const db = getDb();
    const appSnap = await db.collection(COLLECTIONS.apps).doc(appSlugRaw).get();
    if (!appSnap.exists) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    if (appSnap.data()?.developerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db.collection(COLLECTIONS.appAppeals).add({
      appSlug: appSlugRaw,
      developerId: userId,
      reason: reasonValidation.value,
      status: "pending",
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true, message: "Appeal submitted." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit appeal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
