import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { requireMasterUser } from "@/lib/master-allowlist";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("x-admin-secret");
    const isInternal = authHeader === process.env.ADMIN_INTERNAL_SECRET;

    if (!isInternal) {
      const isMasterResp = await requireMasterUser();
      if (isMasterResp) {
        return isMasterResp;
      }
    }

    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    await inngest.send({
      name: "app/submitted",
      data: {
        appId: slug,
        slug: slug,
      },
    });

    return NextResponse.json({ ok: true, message: "Workflow triggered successfully" });
  } catch (error) {
    console.error("Failed to trigger inngest workflow:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
