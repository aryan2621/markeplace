import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { docToPublicApp } from "@/lib/public-app";
import { validateSlug } from "@/lib/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  const slug = (await params).slug;
  const slugValidation = validateSlug(slug ?? "");
  if (!slugValidation.ok) {
    return NextResponse.json({ error: slugValidation.error }, { status: 400 });
  }
  try {
    const db = getDb();
    const appRef = db.collection("apps").doc(slug);
    const appSnap = await appRef.get();
    if (!appSnap.exists || appSnap.data()?.status !== "published") {
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
    return NextResponse.json({ ...app, category, moreFromDeveloper });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load app";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
