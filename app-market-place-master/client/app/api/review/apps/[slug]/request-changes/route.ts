import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { writeAuditLog } from "@/lib/audit-log";

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
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "Please make the requested changes and resubmit.";
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
    await ref.update({ reviewNotes: feedback, status: "draft" });
    await writeAuditLog({
      userId,
      action: "app.request_changes",
      entityType: "app",
      entityId: slug,
      oldValue: status,
      newValue: "draft",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to request changes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
