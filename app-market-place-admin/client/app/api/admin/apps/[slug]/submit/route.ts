import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "POST /api/admin/apps/[slug]/submit";
  const start = Date.now();
  const { userId } = await auth();
  const slug = (await params).slug;
  logRequest(route, "POST", { slug, userId: userId ?? undefined });
  if (!userId) {
    logStep(route, "auth_failed", { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    const db = getDb();
    const devSnap = await db.collection(COLLECTIONS.users).doc(userId).get();
    const devData = devSnap.data();
    if (!devSnap.exists || devData?.developerStatus !== "verified") {
      logStep(route, "developer_check_failed", { status: 403 });
      return NextResponse.json(
        { error: "Developer verification required. Sign in with GitHub to submit apps for review." },
        { status: 403 }
      );
    }

    const slugValidation = validateSlug(slug);
    if (!slugValidation.ok) {
      logStep(route, "validation_failed", { reason: slugValidation.error, slug });
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    const ref = db.collection(COLLECTIONS.apps).doc(slug);
    const appSnap = await ref.get();
    if (!appSnap.exists) {
      logStep(route, "not_found", { slug });
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    const data = appSnap.data()!;
    if (data.developerId !== userId) {
      logStep(route, "forbidden", { slug });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const status = data.status as string | undefined;
    if (status !== "draft" && status !== "rejected") {
      logStep(route, "validation_failed", { reason: "invalid_status", slug, status });
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
    const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || process.env.MASTER_APP_URL || "http://localhost:3000";
    await fetch(`${masterUrl}/api/master/inngest-trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.ADMIN_INTERNAL_SECRET || "",
      },
      body: JSON.stringify({ slug }),
    });
    logStep(route, "app_submitted", { slug });
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json({
      ok: true,
      message: "App submitted for review.",
      submittedAt,
    });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to submit app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
