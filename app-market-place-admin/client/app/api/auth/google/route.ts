import { google } from "googleapis";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.BASE_URL;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  console.log("Environment check:", { 
    baseUrl: baseUrl ? "SET" : "MISSING", 
    clientId: clientId ? "SET" : "MISSING",
    clientSecret: clientSecret ? "SET" : "MISSING"
  });

  if (!baseUrl || !clientId || !clientSecret) {
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

  return NextResponse.redirect(url);
}
