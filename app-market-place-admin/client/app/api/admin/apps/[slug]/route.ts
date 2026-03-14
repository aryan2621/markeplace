import type { DocumentSnapshot } from "firebase-admin/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { getAppIfOwned } from "@/lib/admin-apps";
import { validateSlug, validateUploadKey } from "@/lib/validation";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "GET /api/admin/apps/[slug]";
  const start = Date.now();
  const { userId } = await auth();
  const slug = (await params).slug;
  logRequest(route, "GET", { slug, userId: userId ?? undefined });
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
    const slugValidation = validateSlug(slug);
    if (!slugValidation.ok) {
      logStep(route, "validation_failed", { reason: slugValidation.error, slug });
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    const db = getDb();
    const appSnap = await getAppIfOwned(db, slug, userId);
    if (!appSnap) {
      const exists = (await db.collection(COLLECTIONS.apps).doc(slug).get()).exists;
      logStep(route, exists ? "forbidden" : "not_found", { slug });
      return NextResponse.json(
        { error: exists ? "Forbidden" : "App not found" },
        { status: exists ? 403 : 404 }
      );
    }
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json(docToApp(appSnap));
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "PATCH /api/admin/apps/[slug]";
  const start = Date.now();
  const { userId } = await auth();
  const slug = (await params).slug;
  logRequest(route, "PATCH", { slug, userId: userId ?? undefined });
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
    const slugValidation = validateSlug(slug);
    if (!slugValidation.ok) {
      logStep(route, "validation_failed", { reason: slugValidation.error, slug });
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      logStep(route, "validation_failed", { reason: "invalid_body" });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const db = getDb();

    const packageNameTrimmed = typeof body.packageName === "string" ? body.packageName.trim() : "";
    if (packageNameTrimmed) {
      const existingPkg = await db.collection(COLLECTIONS.apps).where("packageName", "==", packageNameTrimmed).limit(1).get();
      if (!existingPkg.empty && existingPkg.docs[0].id !== slug) {
        logStep(route, "validation_failed", { reason: "package_name_exists", slug });
        return NextResponse.json({ error: "App with this package name already exists" }, { status: 400 });
      }
    }
    const appSnap = await getAppIfOwned(db, slug, userId);
    if (!appSnap) {
      const exists = (await db.collection(COLLECTIONS.apps).doc(slug).get()).exists;
      logStep(route, exists ? "forbidden" : "not_found", { slug });
      return NextResponse.json(
        { error: exists ? "Forbidden" : "App not found" },
        { status: exists ? 403 : 404 }
      );
    }
    const ref = db.collection(COLLECTIONS.apps).doc(slug);
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.developer !== undefined) patch.developer = body.developer;
    if (body.developerEmail !== undefined) patch.developerEmail = body.developerEmail;
    if (body.shortDescription !== undefined) patch.shortDescription = body.shortDescription;
    if (body.description !== undefined) patch.description = body.description;
    if (body.icon !== undefined) patch.icon = body.icon;
    if (body.screenshots !== undefined) patch.screenshots = body.screenshots;
    if (body.videoUrl !== undefined) patch.videoUrl = body.videoUrl;
    if (body.downloadCount !== undefined) patch.downloadCount = body.downloadCount;
    if (body.platform !== undefined) patch.platform = body.platform;
    if (body.categoryId !== undefined) patch.categoryId = body.categoryId;
    if (body.rating !== undefined) patch.rating = body.rating;
    if (body.size !== undefined) patch.size = body.size;
    if (body.featuredOrder !== undefined) patch.featuredOrder = body.featuredOrder;
    if (body.downloadS3Key !== undefined) {
      const keyVal = typeof body.downloadS3Key === "string" ? body.downloadS3Key.trim() : "";
      if (keyVal) {
        const keyValidation = validateUploadKey(keyVal);
        if (!keyValidation.ok) {
          logStep(route, "validation_failed", { reason: keyValidation.error, slug });
          return NextResponse.json({ error: keyValidation.error }, { status: 400 });
        }
        patch.downloadS3Key = keyVal;
      } else {
        patch.downloadS3Key = keyVal;
      }
    }
    if (body.version !== undefined) patch.version = body.version;
    if (body.versionCode !== undefined) patch.versionCode = body.versionCode;
    if (body.status !== undefined) {
      if (body.status !== "draft") {
        return NextResponse.json(
          { error: "Only status 'draft' can be set from Admin. Use Submit for review to submit." },
          { status: 400 }
        );
      }
      patch.status = body.status;
    }
    if (body.packageName !== undefined) patch.packageName = body.packageName;
    if (body.privacyPolicyUrl !== undefined) patch.privacyPolicyUrl = body.privacyPolicyUrl;
    if (body.featureGraphic !== undefined) patch.featureGraphic = body.featureGraphic;
    if (body.apkFile !== undefined) patch.apkFile = body.apkFile;
    if (body.containsAds !== undefined) patch.containsAds = body.containsAds;
    if (body.containsIap !== undefined) patch.containsIap = body.containsIap;
    if (body.containsSubscription !== undefined) patch.containsSubscription = body.containsSubscription;
    if (body.externalPaymentLinks !== undefined) patch.externalPaymentLinks = body.externalPaymentLinks;
    if (body.contentRating !== undefined) patch.contentRating = body.contentRating;
    if (Object.keys(patch).length > 0) {
      await ref.update(patch);
    }
    const dataSafetyUpdate =
      body.collectsPersonalData !== undefined ||
      body.dataTypesCollected !== undefined ||
      body.dataShared !== undefined ||
      body.encryptionUsed !== undefined ||
      body.privacyPolicyUrl !== undefined;
    if (dataSafetyUpdate) {
      const safetyRef = db.collection(COLLECTIONS.appDataSafety).doc(slug);
      const safetySnap = await safetyRef.get();
      const existing = safetySnap.data() ?? {};
      await safetyRef.set({
        appId: slug,
        collectsPersonalData: body.collectsPersonalData ?? existing.collectsPersonalData ?? false,
        dataTypesCollected:
          body.dataTypesCollected !== undefined
            ? (Array.isArray(body.dataTypesCollected) ? body.dataTypesCollected : [])
            : (existing.dataTypesCollected ?? []),
        dataShared: body.dataShared ?? existing.dataShared ?? false,
        encryptionUsed: body.encryptionUsed ?? existing.encryptionUsed ?? false,
        privacyPolicyUrl: body.privacyPolicyUrl ?? existing.privacyPolicyUrl ?? "",
      });
    }
    const updated = await ref.get();
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json(docToApp(updated));
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to update app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
