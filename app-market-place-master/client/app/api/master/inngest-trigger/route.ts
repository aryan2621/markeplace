import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { requireMasterUser } from "@/lib/master-allowlist";
import { validateSlug } from "@/lib/validation";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

export async function POST(req: Request) {
  const route = "POST /api/master/inngest-trigger";
  const start = Date.now();
  logRequest(route, "POST", {});

  try {
    const authHeader = req.headers.get("x-admin-secret");
    const secret = process.env.ADMIN_INTERNAL_SECRET;
    const isInternal =
      typeof secret === "string" && secret.length >= 16 && authHeader === secret;

    if (!isInternal) {
      const isMasterResp = await requireMasterUser();
      if (isMasterResp) {
        logStep(route, "auth_failed", { status: 403 });
        return isMasterResp;
      }
    }

    const body = await req.json().catch(() => null);
    if (body == null) {
      logStep(route, "validation_failed", { reason: "invalid_json" });
      logResponse(route, 400, Date.now() - start, {});
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
    const slugValidation = validateSlug(slugRaw);
    if (!slugValidation.ok) {
      logStep(route, "validation_failed", { reason: slugValidation.error });
      logResponse(route, 400, Date.now() - start, {});
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }
    const slug = slugRaw;

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
