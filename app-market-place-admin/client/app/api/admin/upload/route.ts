import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, getPresignedReadUrl } from "@/lib/filebase";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

const UPLOAD_URL_EXPIRY_SECONDS = 900;
const READ_URL_EXPIRY_SECONDS = 6 * 24 * 3600;

export async function POST(req: NextRequest) {
  const route = "POST /api/admin/upload";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "POST", { userId: userId ?? undefined });
  if (!userId) {
    logStep(route, "auth_failed", { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    let ext = "";
    const requestContentType = req.headers.get("content-type") ?? "";
    if (requestContentType.includes("application/json")) {
      try {
        const body = await req.json();
        const name = typeof body?.filename === "string" ? body.filename : "";
        if (name.includes(".")) ext = name.slice(name.lastIndexOf("."));
      } catch { }
    }
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "") || "u";
    const path = `uploads/${safeUserId}/${randomUUID()}${ext}`;

    const [uploadUrl, readUrl] = await Promise.all([
      getPresignedUploadUrl(path, UPLOAD_URL_EXPIRY_SECONDS, "application/octet-stream"),
      getPresignedReadUrl(path, READ_URL_EXPIRY_SECONDS),
    ]);

    logResponse(route, 200, Date.now() - start, {});
    return NextResponse.json({
      uploadUrl,
      key: path,
      readUrl,
    });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
