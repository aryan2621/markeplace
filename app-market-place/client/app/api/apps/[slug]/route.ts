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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  const slug = (await params).slug;
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  try {
    const db = getDb();
    const appRef = db.collection("apps").doc(slug);
    const appSnap = await appRef.get();
    if (!appSnap.exists || appSnap.data()?.status !== "published") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const app = docToApp(appSnap);
    const doc = appSnap.data()!;
    let category: { id: string; name: string; slug: string } | null = null;
    if (doc.categoryId) {
      const catSnap = await db.collection("categories").doc(doc.categoryId).get();
      if (catSnap.exists) {
        const c = catSnap.data()!;
        category = { id: c.id, name: c.name, slug: c.slug };
      }
    }
    const publishedSnap = await db.collection("apps").where("status", "==", "published").get();
    const moreFromDeveloper = publishedSnap.docs
      .filter((d) => d.data().developer === doc.developer && d.id !== slug)
      .map(docToApp);
    return NextResponse.json({ ...app, category, moreFromDeveloper });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
