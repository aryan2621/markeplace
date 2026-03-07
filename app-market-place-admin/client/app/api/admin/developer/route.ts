import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(userId);
    let devSnap = await userRef.get();

    if (!devSnap.exists) {
      const now = Date.now();
      await userRef.set({
        userId,
        developerStatus: "pending_verification",
        trustScore: 50,
        strikeCount: 0,
        githubId: null,
        githubUsername: null,
        createdAt: now,
      });
      devSnap = await userRef.get();
    }

    const d = devSnap.data()!;
    return NextResponse.json({
      verified: d.developerStatus === "verified",
      developerStatus: d.developerStatus,
      githubUsername: d.githubUsername ?? null,
      trustScore: d.trustScore ?? 50,
      strikeCount: d.strikeCount ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load developer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
