import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkPublicRateLimit } from "@/lib/rate-limit";

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
    const ref = db.collection("apps").doc(slug);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.status !== "published") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = snap.data()!;
    const fileUrl = data.downloadUrl?.trim();
    if (!fileUrl) {
      return NextResponse.json(
        { error: "Download not available" },
        { status: 404 }
      );
    }
    const current = data.downloadCount;
    const num =
      typeof current === "number"
        ? current
        : parseInt(String(current ?? "0"), 10);
    const nextCount = Number.isNaN(num) ? 1 : num + 1;
    await ref.update({ downloadCount: String(nextCount) });
    return NextResponse.redirect(fileUrl, 302);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to prepare download";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
