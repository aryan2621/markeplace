import { google } from "googleapis";
import { getDb } from "./firebase-admin";
import { COLLECTIONS } from "./firestore-collections";

const GMAIL_SENDER = process.env.MASTER_ALLOWED_EMAIL;

async function getGmailClient() {
  if (!process.env.GMAIL_CLIENT_ID) return null;

  const db = getDb();
  const doc = await db.collection(COLLECTIONS.settings).doc("email").get();
  const data = doc.data();
  const token = data?.gmailRefreshToken;

  if (!token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.BASE_URL + "/api/auth/google/callback"
  );

  oauth2Client.setCredentials({ refresh_token: token });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeEmail(to: string, from: string, subject: string, html: string) {
  const str = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    html,
  ].join("\r\n");

  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendEmailApi(to: string, subject: string, html: string): Promise<{ error?: Error }> {
  try {
    const gmail = await getGmailClient();
    if (!gmail) return {}; // Skip silently if no credentials

    if (!GMAIL_SENDER) {
      return { error: new Error("MASTER_ALLOWED_EMAIL not configured") };
    }

    const raw = makeEmail(to, GMAIL_SENDER, subject, html);
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: raw,
      },
    });
    return {};
  } catch (error) {
    if (error instanceof Error) {
        return { error };
    }
    return { error: new Error("Failed to send email via Gmail API") };
  }
}

export async function sendAppSubmissionFailureEmail(params: {
  to: string;
  appName: string;
  slug: string;
  reason: string;
}): Promise<{ error?: Error }> {
  return sendEmailApi(
      params.to,
      `App submission failed: ${params.appName}`,
      `<p>Your app "<strong>${escapeHtml(params.appName)}</strong>" (${escapeHtml(params.slug)}) could not be accepted for review.</p><p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p><p>Please fix the issues and submit again.</p>`
  );
}

export async function sendAppSubmissionSuccessEmail(params: {
  to: string;
  appName: string;
  slug: string;
}): Promise<{ error?: Error }> {
  return sendEmailApi(
      params.to,
      `App submitted for review: ${params.appName}`,
      `<p>Your app "<strong>${escapeHtml(params.appName)}</strong>" (${escapeHtml(params.slug)}) has been accepted and is now in the review queue.</p><p>We will notify you once the review is complete.</p>`
  );
}
