import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getPresignedReadUrl, objectExists } from "@/lib/filebase";
import { checkAdminRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  const path = req.nextUrl.searchParams.get("storageId") ?? req.nextUrl.searchParams.get("key");
  if (!path) {
    return NextResponse.json({ error: "storageId or key required" }, { status: 400 });
  }
  try {
    const exists = await objectExists(path);
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const url = await getPresignedReadUrl(path);
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to get URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
