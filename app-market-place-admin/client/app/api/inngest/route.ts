import { NextRequest, NextResponse } from "next/server";
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { appSubmitted, checkReportThresholds } from "@/inngest/functions";

const handlers = serve({
  client: inngest,
  functions: [appSubmitted, checkReportThresholds],
});

/** INNGEST_SIGNING_KEY must be set in env so Inngest can verify webhook requests. Without it, POST/PUT are rejected. */
function requireSigningKey() {
  if (!process.env.INNGEST_SIGNING_KEY?.trim()) {
    return NextResponse.json(
      { error: "Webhook verification not configured." },
      { status: 503 }
    );
  }
  return null;
}

export const GET = handlers.GET;

export async function POST(
  req: NextRequest,
  context: { params?: Promise<Record<string, string>> }
) {
  const err = requireSigningKey();
  if (err) return err;
  return handlers.POST(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params?: Promise<Record<string, string>> }
) {
  const err = requireSigningKey();
  if (err) return err;
  return handlers.PUT(req, context);
}
