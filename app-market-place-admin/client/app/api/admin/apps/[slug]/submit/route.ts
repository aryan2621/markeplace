import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";
import {
  validateIdempotencyKey,
  tryClaimIdempotencyKey,
  setIdempotentResponse,
} from "@/lib/idempotency";

export async function POST(
  req: NextRequest,
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
  const idemCheck = validateIdempotencyKey(req.headers.get("idempotency-key"));
  if (!idemCheck.ok) {
    logStep(route, "validation_failed", { reason: idemCheck.error });
    return NextResponse.json({ error: idemCheck.error }, { status: 400 });
  }
  const claim = await tryClaimIdempotencyKey(userId, idemCheck.key);
  if ("cached" in claim) {
    logStep(route, "idempotent_replay", { slug });
    return NextResponse.json(claim.body, { status: claim.status });
  }
  if ("conflict" in claim) {
    logStep(route, "idempotency_conflict", { slug });
    return NextResponse.json(
      { error: "Request with this idempotency key is already in progress." },
      { status: 409 }
    );
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
      const body = { error: "Developer verification required. Sign in with GitHub to submit apps for review." };
      await setIdempotentResponse(userId, idemCheck.key, 403, body).catch(() => {});
      return NextResponse.json(body, { status: 403 });
    }

    const slugValidation = validateSlug(slug);
    if (!slugValidation.ok) {
      logStep(route, "validation_failed", { reason: slugValidation.error, slug });
      const body = { error: slugValidation.error };
      await setIdempotentResponse(userId, idemCheck.key, 400, body).catch(() => {});
      return NextResponse.json(body, { status: 400 });
    }
    const ref = db.collection(COLLECTIONS.apps).doc(slug);
    const appSnap = await ref.get();
    if (!appSnap.exists) {
      logStep(route, "not_found", { slug });
      const body = { error: "App not found" };
      await setIdempotentResponse(userId, idemCheck.key, 404, body).catch(() => {});
      return NextResponse.json(body, { status: 404 });
    }
    const data = appSnap.data()!;
    if (data.developerId !== userId) {
      logStep(route, "forbidden", { slug });
      const body = { error: "Forbidden" };
      await setIdempotentResponse(userId, idemCheck.key, 403, body).catch(() => {});
      return NextResponse.json(body, { status: 403 });
    }
    const status = data.status as string | undefined;
    const allowedStatuses = ["draft", "rejected", "published"];
    if (!allowedStatuses.includes(status ?? "")) {
      logStep(route, "validation_failed", { reason: "invalid_status", slug, status });
      const body = { error: "Only draft, rejected, or published (version update) apps can be submitted for review." };
      await setIdempotentResponse(userId, idemCheck.key, 400, body).catch(() => {});
      return NextResponse.json(body, { status: 400 });
    }

    if (status === "published") {
      const versionCode = typeof data.versionCode === "number" ? data.versionCode : parseInt(String(data.versionCode ?? ""), 10);
      const lastCode = typeof data.lastPublishedVersionCode === "number" ? data.lastPublishedVersionCode : parseInt(String(data.lastPublishedVersionCode ?? ""), 10);
      const lastCodeNum = Number.isNaN(lastCode) ? 0 : lastCode;
      if (typeof versionCode !== "number" || Number.isNaN(versionCode) || versionCode <= lastCodeNum) {
        logStep(route, "validation_failed", { reason: "version_bump_required", slug });
        const body = { error: "For published app updates, versionCode must be greater than the last published version." };
        await setIdempotentResponse(userId, idemCheck.key, 400, body).catch(() => {});
        return NextResponse.json(body, { status: 400 });
      }
    }
    const submittedAt = Date.now();
    await ref.update({
      status: "pending_review",
      submittedAt,
    });
    const successBody = {
      ok: true,
      message: "App submitted for review.",
      submittedAt,
    };
    await setIdempotentResponse(userId, idemCheck.key, 200, successBody);
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
    return NextResponse.json(successBody);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to submit app";
    const errorBody = { error: message };
    await setIdempotentResponse(userId, idemCheck.key, 500, errorBody).catch(() => {});
    return NextResponse.json(errorBody, { status: 500 });
  }
}
