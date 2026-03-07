import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";
import { docToPublicApp } from "@/lib/public-app";

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
      .map(({ doc }) => docToPublicApp(doc));
    return NextResponse.json(withOrder);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load featured apps";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
