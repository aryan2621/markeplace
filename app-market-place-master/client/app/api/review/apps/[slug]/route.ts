import type { DocumentSnapshot } from "firebase-admin/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
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
    reviewNotes: d.reviewNotes ?? null,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "GET /api/review/apps/[slug]";
  const start = Date.now();
  const { userId } = await auth();
  const slug = (await params).slug;
  logRequest(route, "GET", { slug, userId: userId ?? undefined });
  if (!userId) {
    logStep(route, "auth_failed", { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowRes = await requireMasterUser();
  if (allowRes) {
    logStep(route, "auth_failed", { status: 403 });
    return allowRes;
  }
  const rateLimitRes = await checkMasterRateLimit(userId);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    const db = getDb();
    const appSnap = await db.collection(COLLECTIONS.apps).doc(slug).get();
    if (!appSnap.exists) {
      logStep(route, "not_found", { slug });
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    const app = docToApp(appSnap);
    const dataSafetySnap = await db.collection(COLLECTIONS.appDataSafety).doc(slug).get();
    const dataSafety = dataSafetySnap.exists ? dataSafetySnap.data() : null;
    const permissionsSnap = await db.collection(COLLECTIONS.appPermissions).where("appId", "==", slug).get();
    const permissions = permissionsSnap.docs.map((d) => d.data());
    const riskSnap = await db.collection(COLLECTIONS.riskLogs).where("appId", "==", slug).get();
    const risks = riskSnap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const latestRisk = risks[0] ?? null;
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json({
      app,
      dataSafety,
      permissions,
      latestRisk,
    });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
