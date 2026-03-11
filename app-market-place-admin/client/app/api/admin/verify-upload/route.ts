import { NextResponse } from "next/server";
import { logRequest, logResponse } from "@/lib/api-logger";

export async function POST() {
  const route = "POST /api/admin/verify-upload";
  const start = Date.now();
  logRequest(route, "POST", {});
  logResponse(route, 501, Date.now() - start, {});
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
