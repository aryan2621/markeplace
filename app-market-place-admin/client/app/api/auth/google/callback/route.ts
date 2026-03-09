import { google } from "googleapis";
import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/firestore-collections";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.BASE_URL + "/api/auth/google/callback"
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    let dbStatus = "No refresh token returned. Did you already authorize this app? Go to Google Account Permissions and explicitly remove this app, then try again to force a new refresh token.";
    
    if (tokens.refresh_token) {
      const db = getDb();
      await db.collection(COLLECTIONS.settings).doc("email").set({
        gmailRefreshToken: tokens.refresh_token,
        updatedAt: new Date()
      }, { merge: true });
      dbStatus = "Refresh token successfully saved to the database.";
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail API Connected - Marketplace</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  fontFamily: {
                    sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif']
                  }
                }
              }
            }
          </script>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div class="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
              ✓
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Gmail API Connected</h1>
            <p class="text-gray-600 mb-8">Your marketplace email service is now configured</p>
            
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</div>
              <div class="font-mono text-sm ${tokens.refresh_token ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-700'} p-2 rounded border">
                ${dbStatus}
              </div>
            </div>
            
            <p class="text-sm text-gray-500">You can now close this window and return to the marketplace.</p>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Error exchanging code for token", error);
    return new NextResponse("Failed to exchange code", { status: 500 });
  }
}
