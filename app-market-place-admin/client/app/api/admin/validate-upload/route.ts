import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkAdminRateLimit } from "@/lib/rate-limit";
import { logRequest, logStep, logResponse } from "@/lib/api-logger";

export async function POST() {
  const route = "POST /api/admin/validate-upload";
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
  logResponse(route, 501, Date.now() - start, {});
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
