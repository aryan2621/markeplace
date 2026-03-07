import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export async function sendAppSubmissionFailureEmail(params: {
  to: string;
  appName: string;
  slug: string;
  reason: string;
}): Promise<{ error?: Error }> {
  if (!resend) return {};
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `App submission failed: ${params.appName}`,
    html: `<p>Your app "<strong>${escapeHtml(params.appName)}</strong>" (${escapeHtml(params.slug)}) could not be accepted for review.</p><p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p><p>Please fix the issues and submit again.</p>`,
  });
  return data ? {} : { error: error ?? new Error("Failed to send") };
}

export async function sendAppSubmissionSuccessEmail(params: {
  to: string;
  appName: string;
  slug: string;
}): Promise<{ error?: Error }> {
  if (!resend) return {};
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `App submitted for review: ${params.appName}`,
    html: `<p>Your app "<strong>${escapeHtml(params.appName)}</strong>" (${escapeHtml(params.slug)}) has been accepted and is now in the review queue.</p><p>We will notify you once the review is complete.</p>`,
  });
  return data ? {} : { error: error ?? new Error("Failed to send") };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
