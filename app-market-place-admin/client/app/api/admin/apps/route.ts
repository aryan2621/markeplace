import type { DocumentSnapshot } from "firebase-admin/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

function docToApp(doc: DocumentSnapshot) {
  const d = doc.data()!;
  return {
    id: doc.id,
    slug: d.slug,
    name: d.name,
    developer: d.developer,
    shortDescription: d.shortDescription,
    description: d.description,
    icon: d.icon,
    screenshots: d.screenshots ?? [],
    videoUrl: d.videoUrl ?? null,
    downloadCount: d.downloadCount,
    platform: d.platform,
    categoryId: d.categoryId,
    rating: d.rating ?? null,
    size: d.size ?? null,
    downloadS3Key: d.downloadS3Key ?? null,
    version: d.version ?? null,
    versionCode: d.versionCode ?? null,
    status: d.status,
    rejectionReason: d.rejectionReason ?? null,
    verificationResult: d.verificationResult ?? null,
    submittedAt: d.submittedAt != null ? String(d.submittedAt) : null,
    publishedAt: d.publishedAt != null ? String(d.publishedAt) : null,
    developerEmail: d.developerEmail,
    riskScore: d.riskScore ?? null,
    lastVerifiedAt: d.lastVerifiedAt != null ? String(d.lastVerifiedAt) : null,
    packageName: d.packageName ?? null,
    privacyPolicyUrl: d.privacyPolicyUrl ?? null,
    developerId: d.developerId ?? null,
    githubUsername: d.githubUsername ?? null,
    githubId: d.githubId ?? null,
    reviewNotes: d.reviewNotes ?? null,
    featureGraphic: d.featureGraphic ?? null,
    apkFile: d.apkFile ?? null,
    containsAds: d.containsAds ?? null,
    containsIap: d.containsIap ?? null,
    containsSubscription: d.containsSubscription ?? null,
    externalPaymentLinks: d.externalPaymentLinks ?? null,
    contentRating: d.contentRating ?? null,
  };
}

export async function GET(req: NextRequest) {
  const route = "GET /api/admin/apps";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "GET", { userId: userId ?? undefined });
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
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;

    const snap = await db.collection(COLLECTIONS.apps).where("developerId", "==", userId).get();
    let rows = snap.docs.map(docToApp);
    if (categoryId?.trim()) {
      rows = rows.filter((r) => r.categoryId === categoryId);
    }
    if (search?.trim()) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.developer.toLowerCase().includes(lower) ||
          r.shortDescription.toLowerCase().includes(lower)
      );
    }
    logResponse(route, 200, Date.now() - start, { count: rows.length });
    return NextResponse.json(rows);
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load apps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const route = "POST /api/admin/apps";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "POST", { userId: userId ?? undefined });
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
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      logStep(route, "validation_failed", { reason: "invalid_body" });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
    const slugValidation = validateSlug(slugRaw);
    if (!slugValidation.ok) {
      logStep(route, "validation_failed", { reason: slugValidation.error });
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    const slug = slugRaw;
    const db = getDb();
    const existing = await db.collection(COLLECTIONS.apps).doc(slug).get();
    if (existing.exists) {
      logStep(route, "validation_failed", { reason: "slug_exists", slug });
      return NextResponse.json({ error: "App with this slug already exists" }, { status: 400 });
    }

    const packageNameTrimmed = typeof body.packageName === "string" ? body.packageName.trim() : "";
    if (packageNameTrimmed) {
      const existingPkg = await db.collection(COLLECTIONS.apps).where("packageName", "==", packageNameTrimmed).limit(1).get();
      if (!existingPkg.empty) {
        logStep(route, "validation_failed", { reason: "package_name_exists" });
        return NextResponse.json({ error: "App with this package name already exists" }, { status: 400 });
      }
    }
    const raw: Record<string, unknown> = {
      slug,
      name: body.name,
      developer: body.developer,
      developerEmail: body.developerEmail,
      developerId: userId,
      shortDescription: body.shortDescription,
      description: body.description,
      icon: body.icon,
      screenshots: Array.isArray(body.screenshots) ? body.screenshots : [],
      videoUrl: body.videoUrl,
      downloadCount: body.downloadCount,
      platform: body.platform,
      categoryId: body.categoryId,
      rating: body.rating,
      size: body.size,
      featuredOrder: body.featuredOrder,
      downloadS3Key: body.downloadS3Key,
      version: body.version,
      versionCode: body.versionCode,
      status: "draft",
      packageName: body.packageName,
      privacyPolicyUrl: body.privacyPolicyUrl,
      featureGraphic: body.featureGraphic,
      apkFile: body.apkFile,
      containsAds: body.containsAds,
      containsIap: body.containsIap,
      containsSubscription: body.containsSubscription,
      externalPaymentLinks: body.externalPaymentLinks,
      contentRating: body.contentRating,
    };
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined) data[k] = v;
    }
    await db.collection(COLLECTIONS.apps).doc(slug).set(data);
    const privacyPolicyUrl = body.privacyPolicyUrl ?? data.privacyPolicyUrl;
    if (
      body.collectsPersonalData !== undefined ||
      body.dataTypesCollected !== undefined ||
      body.dataShared !== undefined ||
      body.encryptionUsed !== undefined ||
      privacyPolicyUrl !== undefined
    ) {
      await db.collection(COLLECTIONS.appDataSafety).doc(slug).set({
        appId: slug,
        collectsPersonalData: body.collectsPersonalData ?? false,
        dataTypesCollected: Array.isArray(body.dataTypesCollected) ? body.dataTypesCollected : [],
        dataShared: body.dataShared ?? false,
        encryptionUsed: body.encryptionUsed ?? false,
        privacyPolicyUrl: privacyPolicyUrl ?? "",
      });
    }
    const created = await db.collection(COLLECTIONS.apps).doc(slug).get();
    logStep(route, "app_created", { slug });
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json(docToApp(created));
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to create app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
