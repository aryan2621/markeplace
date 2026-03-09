import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowRes = await requireMasterUser();
  if (allowRes) return allowRes;
  const rateLimitRes = await checkMasterRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const db = getDb();
    const col = db.collection(COLLECTIONS.appAppeals);
    const snap = await col.where("status", "==", "pending").get();
    const appeals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json(appeals);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load appeals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
