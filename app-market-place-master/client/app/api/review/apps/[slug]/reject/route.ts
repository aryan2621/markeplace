import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { writeAuditLog } from "@/lib/audit-log";
import { sendAppRejectedEmail } from "@/lib/email";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowRes = await requireMasterUser();
  if (allowRes) return allowRes;
  const rateLimitRes = await checkMasterRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "Rejected by reviewer.";
    const addStrike = body.addStrike === true;
    const db = getDb();
    const ref = db.collection(COLLECTIONS.apps).doc(slug);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    const data = snap.data()!;
    const status = data.status as string;
    if (status !== "in_review" && status !== "pending_review") {
      return NextResponse.json({ error: "App is not in review" }, { status: 400 });
    }
    await ref.update({ status: "rejected", rejectionReason: reason });
    if (addStrike && data.developerId) {
      const severity = body.severity === "permanent" ? "permanent" : body.severity === "temp_suspend" ? "temp_suspend" : "warning";
      await db.collection(COLLECTIONS.developerStrikes).add({
        developerId: data.developerId,
        appId: slug,
        reason,
        severity,
        createdAt: Date.now(),
      });
      const devRef = db.collection(COLLECTIONS.users).doc(data.developerId as string);
      const devSnap = await devRef.get();
      if (devSnap.exists) {
        const devData = devSnap.data()!;
        const strikeCount = ((devData.strikeCount as number) ?? 0) + 1;
        const updates: Record<string, unknown> = { strikeCount };
        if (strikeCount >= 3) updates.developerStatus = "suspended";
        await devRef.update(updates);
      }
    }
    await writeAuditLog({
      userId,
      action: "app.rejected",
      entityType: "app",
      entityId: slug,
      oldValue: status,
      newValue: "rejected",
    });
    const developerEmail = typeof data.developerEmail === "string" ? data.developerEmail.trim() : "";
    if (developerEmail) {
      await sendAppRejectedEmail({
        to: developerEmail,
        appName: (data.name as string) || slug,
        slug,
        reason,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reject";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
