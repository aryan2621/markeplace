import { google } from "googleapis";
import { type NextRequest, NextResponse } from "next/server";
import { logRequest, logStep, logResponse } from "@/lib/api-logger";

export async function GET(_req: NextRequest) {
  const route = "GET /api/auth/google";
  const start = Date.now();
  logRequest(route, "GET", {});

  const baseUrl = process.env.BASE_URL;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    logStep(route, "config_missing", {
      baseUrl: baseUrl ? "SET" : "MISSING",
      clientId: clientId ? "SET" : "MISSING",
      clientSecret: clientSecret ? "SET" : "MISSING",
    });
    logResponse(route, 500, Date.now() - start, {});
    return new NextResponse("Missing environment variables", { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    baseUrl + "/api/auth/google/callback"
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.send"],
  });

  logResponse(route, 302, Date.now() - start, {});
  return NextResponse.redirect(url);
}
