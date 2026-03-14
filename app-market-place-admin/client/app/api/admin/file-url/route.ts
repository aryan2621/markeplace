import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getPresignedReadUrl, objectExists } from "@/lib/filebase";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { validateUploadKeyOwnership } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function GET(req: NextRequest) {
  const route = "GET /api/admin/file-url";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "GET", { userId: userId ?? undefined });
  if (!userId) {
    logStep(route, "auth_failed", { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitRes = await checkAdminRateLimit(userId);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  const path = req.nextUrl.searchParams.get("storageId") ?? req.nextUrl.searchParams.get("key");
  const keyValidation = validateUploadKeyOwnership(path ?? "", userId);
  if (!keyValidation.ok) {
    logStep(route, "validation_failed", { reason: keyValidation.error });
    return NextResponse.json({ error: keyValidation.error }, { status: 400 });
  }
  const safePath = (path ?? "").trim();
  try {
    const exists = await objectExists(safePath);
    if (!exists) {
      logStep(route, "not_found", {});
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const url = await getPresignedReadUrl(safePath);
    logResponse(route, 200, Date.now() - start, {});
    return NextResponse.json({ url });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to get URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
