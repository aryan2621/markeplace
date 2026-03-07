import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendAppApprovedEmail(params: {
  to: string;
  appName: string;
  slug: string;
  appUrl: string | null;
}): Promise<{ error?: Error }> {
  if (!resend) return {};
  const { to, appName, slug, appUrl } = params;
  const linkHtml = appUrl
    ? `<p><a href="${escapeHtml(appUrl)}">View your app in the marketplace</a></p>`
    : "<p>Your app is now live in the marketplace.</p>";
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `App approved: ${appName}`,
    html: `<p>Your app "<strong>${escapeHtml(appName)}</strong>" (${escapeHtml(slug)}) has been approved and published.</p>${linkHtml}`,
  });
  return data ? {} : { error: error ?? new Error("Failed to send") };
}

export async function sendAppRejectedEmail(params: {
  to: string;
  appName: string;
  slug: string;
  reason: string;
}): Promise<{ error?: Error }> {
  if (!resend) return {};
  const { to, appName, slug, reason } = params;
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `App not approved: ${appName}`,
    html: `<p>Your app "<strong>${escapeHtml(appName)}</strong>" (${escapeHtml(slug)}) was not approved.</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p>You can address the feedback and submit again from your developer dashboard.</p>`,
  });
  return data ? {} : { error: error ?? new Error("Failed to send") };
}
