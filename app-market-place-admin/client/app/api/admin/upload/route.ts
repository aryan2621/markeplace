import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, getPresignedReadUrl } from "@/lib/filebase";
import { checkAdminRateLimit } from "@/lib/rate-limit";

const UPLOAD_URL_EXPIRY_SECONDS = 900;
const READ_URL_EXPIRY_SECONDS = 6 * 24 * 3600;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) return rateLimitRes;
  try {
    let ext = "";
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body = await req.json();
        const name = typeof body?.filename === "string" ? body.filename : "";
        if (name.includes(".")) ext = name.slice(name.lastIndexOf("."));
      } catch {}
    }
    const path = `uploads/${randomUUID()}${ext}`;

    const [uploadUrl, readUrl] = await Promise.all([
      getPresignedUploadUrl(path, UPLOAD_URL_EXPIRY_SECONDS),
      getPresignedReadUrl(path, READ_URL_EXPIRY_SECONDS),
    ]);

    return NextResponse.json({
      uploadUrl,
      key: path,
      readUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
