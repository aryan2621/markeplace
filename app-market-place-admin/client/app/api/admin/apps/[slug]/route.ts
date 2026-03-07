import type { DocumentSnapshot } from "firebase-admin/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";

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
    downloadUrl: d.downloadUrl ?? null,
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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const { slug } = await params;
    const db = getDb();
    const appSnap = await db.collection(COLLECTIONS.apps).doc(slug).get();
    if (!appSnap.exists) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    return NextResponse.json(docToApp(appSnap));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const { slug } = await params;
    const body = await req.json();
    const db = getDb();
    const ref = db.collection(COLLECTIONS.apps).doc(slug);
    const appSnap = await ref.get();
    if (!appSnap.exists) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
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
    if (body.downloadUrl !== undefined) patch.downloadUrl = body.downloadUrl;
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
    return NextResponse.json(docToApp(updated));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
