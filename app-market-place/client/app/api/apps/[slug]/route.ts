import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { docToPublicApp } from "@/lib/public-app";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const route = "GET /api/apps/[slug]";
  const start = Date.now();
  const slug = (await params).slug;
  logRequest(route, "GET", { slug });

  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  const slugValidation = validateSlug(slug ?? "");
  if (!slugValidation.ok) {
    logStep(route, "validation_failed", { reason: slugValidation.error, slug });
    return NextResponse.json({ error: slugValidation.error }, { status: 400 });
  }
  try {
    const db = getDb();
    const appRef = db.collection("apps").doc(slug);
    const appSnap = await appRef.get();
    if (!appSnap.exists || appSnap.data()?.status !== "published") {
      logStep(route, "not_found", { slug });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const app = docToPublicApp(appSnap);
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
      .map(docToPublicApp);
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json({ ...app, category, moreFromDeveloper });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to load app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
