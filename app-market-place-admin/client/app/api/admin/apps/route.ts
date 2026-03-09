import type { DocumentSnapshot } from "firebase-admin/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { validateSlug } from "@/lib/validation";

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

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
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
    return NextResponse.json(rows);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load apps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    const body = await req.json();
    const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
    const slugValidation = validateSlug(slugRaw);
    if (!slugValidation.ok) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    const slug = slugRaw;
    const db = getDb();
    const existing = await db.collection(COLLECTIONS.apps).doc(slug).get();
    if (existing.exists) {
      return NextResponse.json({ error: "App with this slug already exists" }, { status: 400 });
    }

    if (body.packageName?.trim()) {
      const existingPkg = await db.collection(COLLECTIONS.apps).where("packageName", "==", body.packageName.trim()).limit(1).get();
      if (!existingPkg.empty) {
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
      downloadUrl: body.downloadUrl,
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
    return NextResponse.json(docToApp(created));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
