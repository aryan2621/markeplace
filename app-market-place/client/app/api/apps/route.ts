import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { docToPublicApp } from "@/lib/public-app";

export async function GET(req: NextRequest) {
  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  try {
    const searchParams = req.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const db = getDb();
    const query = db.collection("apps").where("status", "==", "published");
    const snap = await query.get();
    let rows = snap.docs.map(docToPublicApp);

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
