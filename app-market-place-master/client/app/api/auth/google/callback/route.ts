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
    
    const isSuccess = Boolean(tokens.refresh_token);
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Authentication ${isSuccess ? 'Successful' : 'Status'} - Marketplace</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            :root {
              --bg: #ffffff;
              --text: #111827;
              --text-muted: #6b7280;
              --card-bg: #ffffff;
              --border: #e5e7eb;
              --success: #16a34a;
              --success-bg: #f0fdf4;
              --success-border: #bbf7d0;
              --btn-bg: #111827;
              --btn-text: #ffffff;
              --btn-hover: #374151;
            }
            @media (prefers-color-scheme: dark) {
              :root {
                --bg: #09090b;
                --text: #f9fafb;
                --text-muted: #9ca3af;
                --card-bg: #18181b;
                --border: #27272a;
                --success: #22c55e;
                --success-bg: rgba(34, 197, 94, 0.1);
                --success-border: rgba(34, 197, 94, 0.2);
                --btn-bg: #ffffff;
                --btn-text: #09090b;
                --btn-hover: #e4e4e7;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background-color: var(--bg);
              color: var(--text);
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 1rem;
              box-sizing: border-box;
            }
            .container {
              background-color: var(--card-bg);
              border: 1px solid var(--border);
              border-radius: 1rem;
              padding: 2.5rem 2rem;
              max-w: 24rem;
              width: 100%;
              text-align: center;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            .icon {
              width: 4rem;
              height: 4rem;
              background-color: var(--success);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 2rem;
              margin: 0 auto 1.5rem;
            }
            h1 {
              font-size: 1.5rem;
              font-weight: 700;
              margin: 0 0 0.5rem;
            }
            p {
              color: var(--text-muted);
              margin: 0 0 2rem;
              line-height: 1.5;
            }
            .status-box {
              background-color: ${isSuccess ? 'var(--success-bg)' : 'transparent'};
              border: 1px solid ${isSuccess ? 'var(--success-border)' : 'var(--border)'};
              color: ${isSuccess ? 'var(--success)' : 'var(--text-muted)'};
              border-radius: 0.5rem;
              padding: 1rem;
              font-family: monospace;
              font-size: 0.875rem;
              text-align: left;
              margin-bottom: 2rem;
              word-break: break-word;
            }
            .btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background-color: var(--btn-bg);
              color: var(--btn-text);
              text-decoration: none;
              font-weight: 500;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              width: 100%;
              box-sizing: border-box;
              transition: background-color 0.2s;
              border: none;
              cursor: pointer;
              font-size: 1rem;
            }
            .btn:hover {
              background-color: var(--btn-hover);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h1>Authentication Successful</h1>
            <p>Your authentication flow is complete, and the application is connected.</p>
            
            <div class="status-box">
              ${dbStatus}
            </div>
            
            <button class="btn" onclick="handleClose()">Return to Application</button>
            <script>
              function handleClose() {
                // If this is a popup, try to close it and return focus to parent
                if (window.opener) {
                  window.close();
                } else {
                  // Fallback: forcefully redirect back to homepage
                  window.location.href = '/'; 
                }
              }
            </script>
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
