import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const upheld = body.upheld === true;
    const db = getDb();
    const ref = db.collection(COLLECTIONS.appAppeals).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
    }
    const data = snap.data()!;
    if (data.status !== "pending") {
      return NextResponse.json({ error: "Appeal already resolved" }, { status: 400 });
    }
    await ref.update({
      status: upheld ? "upheld" : "rejected",
      resolvedBy: userId,
      resolvedAt: Date.now(),
    });
    await writeAuditLog({
      userId,
      action: "appeal.resolved",
      entityType: "appeal",
      entityId: id,
      oldValue: "pending",
      newValue: upheld ? "upheld" : "rejected",
    });
    return NextResponse.json({ ok: true, upheld });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve appeal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
