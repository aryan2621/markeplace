import type { DocumentSnapshot } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";

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
  };
}

export async function GET(req: NextRequest) {
  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  try {
    const db = getDb();
    const snap = await db
      .collection("apps")
      .where("status", "==", "published")
      .get();
    const withOrder = snap.docs
      .map((doc) => ({ doc, data: doc.data() }))
      .filter(({ data }) => data.featuredOrder != null)
      .sort((a, b) => (a.data.featuredOrder ?? 0) - (b.data.featuredOrder ?? 0))
      .map(({ doc }) => docToApp(doc));
    return NextResponse.json(withOrder);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load featured apps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
