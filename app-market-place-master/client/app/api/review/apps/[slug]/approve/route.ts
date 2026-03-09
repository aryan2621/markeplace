import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { writeAuditLog } from "@/lib/audit-log";
import { sendAppApprovedEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
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
    const publishedAt = Date.now();
    await ref.update({ status: "published", publishedAt });
    await writeAuditLog({
      userId,
      action: "app.approved",
      entityType: "app",
      entityId: slug,
      oldValue: status,
      newValue: "published",
    });
    const developerEmail = typeof data.developerEmail === "string" ? data.developerEmail.trim() : "";
    if (developerEmail) {
      const base = process.env.MARKETPLACE_APP_BASE_URL;
      const appUrl = base ? `${base.replace(/\/$/, "")}/app/${encodeURIComponent(slug)}` : null;
      await sendAppApprovedEmail({
        to: developerEmail,
        appName: (data.name as string) || slug,
        slug,
        appUrl,
      });
    }
    return NextResponse.json({ ok: true, publishedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to approve";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
