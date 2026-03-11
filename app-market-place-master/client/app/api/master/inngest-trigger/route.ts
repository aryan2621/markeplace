import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { requireMasterUser } from "@/lib/master-allowlist";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(req: Request) {
  const route = "POST /api/master/inngest-trigger";
  const start = Date.now();
  logRequest(route, "POST", {});

  try {
    const authHeader = req.headers.get("x-admin-secret");
    const isInternal = authHeader === process.env.ADMIN_INTERNAL_SECRET;

    if (!isInternal) {
      const isMasterResp = await requireMasterUser();
      if (isMasterResp) {
        logStep(route, "auth_failed", { status: 403 });
        return isMasterResp;
      }
    }

    const { slug } = await req.json();

    if (!slug) {
      logStep(route, "validation_failed", { reason: "slug_required" });
      logResponse(route, 400, Date.now() - start, {});
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    await inngest.send({
      name: "app/submitted",
      data: {
        appId: slug,
        slug: slug,
      },
    });

    logStep(route, "triggered", { slug });
    logResponse(route, 200, Date.now() - start, { slug });
    return NextResponse.json({ ok: true, message: "Workflow triggered successfully" });
  } catch (error) {
    logError(route, error, { status: 500, durationMs: Date.now() - start });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
