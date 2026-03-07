import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { inngest } from "@/inngest/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const db = getDb();
    const devSnap = await db.collection(COLLECTIONS.users).doc(userId).get();
    const devData = devSnap.data();
    if (!devSnap.exists || devData?.developerStatus !== "verified") {
      return NextResponse.json(
        { error: "Developer verification required. Sign in with GitHub to submit apps for review." },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const ref = db.collection(COLLECTIONS.apps).doc(slug);
    const appSnap = await ref.get();
    if (!appSnap.exists) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    const data = appSnap.data()!;
    const status = data.status as string | undefined;
    if (status !== "draft" && status !== "rejected") {
      return NextResponse.json(
        { error: "Only draft or rejected apps can be submitted for review." },
        { status: 400 }
      );
    }
    const submittedAt = Date.now();
    await ref.update({
      status: "pending_review",
      submittedAt,
    });
    await inngest.send({
      name: "app/submitted",
      data: { appId: slug, slug },
    });
    return NextResponse.json({
      ok: true,
      message: "App submitted for review.",
      submittedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
