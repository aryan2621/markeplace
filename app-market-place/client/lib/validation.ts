const SLUG_MIN_LENGTH = 1;
const SLUG_MAX_LENGTH = 100;
const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

const EMAIL_MAX_LENGTH = 254;
const REPORT_REASON_MAX_LENGTH = 2000;
const APP_ID_SLUG_MAX_LENGTH = 200;

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateSlug(slug: string): { ok: true } | { ok: false; error: string } {
  if (typeof slug !== "string") {
    return { ok: false, error: "slug must be a string" };
  }
  const trimmed = slug.trim();
  if (trimmed.length < SLUG_MIN_LENGTH || trimmed.length > SLUG_MAX_LENGTH) {
    return {
      ok: false,
      error: `slug must be between ${SLUG_MIN_LENGTH} and ${SLUG_MAX_LENGTH} characters`,
    };
  }
  if (!SLUG_PATTERN.test(trimmed)) {
    return { ok: false, error: "slug may only contain letters, numbers, hyphens, and underscores" };
  }
  return { ok: true };
}

/** Validates S3/storage key used for downloads. Rejects path traversal and non-uploads keys. */
export function validateDownloadKey(key: string): { ok: true } | { ok: false; error: string } {
  if (typeof key !== "string" || !key.trim()) {
    return { ok: false, error: "Download key required" };
  }
  const trimmed = key.trim();
  if (trimmed.includes("..")) {
    return { ok: false, error: "Invalid download key" };
  }
  if (!trimmed.startsWith("uploads/")) {
    return { ok: false, error: "Invalid download key" };
  }
  const UPLOAD_KEY_PATTERN = /^uploads\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/;
  if (!UPLOAD_KEY_PATTERN.test(trimmed)) {
    return { ok: false, error: "Invalid download key" };
  }
  return { ok: true };
}

export function validateReportBody(body: unknown): {
  ok: true;
  appId: string;
  appSlug: string;
  reporterEmail?: string;
  reason?: string;
} | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "body must be an object" };
  }
  const b = body as Record<string, unknown>;
  const appId = typeof b.appId === "string" ? b.appId.trim() : "";
  const appSlug = typeof b.appSlug === "string" ? b.appSlug.trim() : "";
  if (!appId || !appSlug) {
    return { ok: false, error: "appId and appSlug required" };
  }
  if (appId.length > APP_ID_SLUG_MAX_LENGTH || appSlug.length > APP_ID_SLUG_MAX_LENGTH) {
    return { ok: false, error: "appId and appSlug too long" };
  }
  if (!SLUG_PATTERN.test(appId) || !SLUG_PATTERN.test(appSlug)) {
    return { ok: false, error: "appId and appSlug may only contain letters, numbers, hyphens, and underscores" };
  }
  const reporterEmail =
    typeof b.reporterEmail === "string" ? b.reporterEmail.trim() : undefined;
  if (reporterEmail !== undefined && reporterEmail !== "") {
    if (reporterEmail.length > EMAIL_MAX_LENGTH) {
      return { ok: false, error: "reporterEmail too long" };
    }
    if (!EMAIL_PATTERN.test(reporterEmail)) {
      return { ok: false, error: "reporterEmail must be a valid email" };
    }
  }
  const reason = typeof b.reason === "string" ? b.reason : undefined;
  if (reason !== undefined && reason.length > REPORT_REASON_MAX_LENGTH) {
    return { ok: false, error: `reason must be at most ${REPORT_REASON_MAX_LENGTH} characters` };
  }
  return {
    ok: true,
    appId,
    appSlug,
    reporterEmail: reporterEmail || undefined,
    reason: reason || undefined,
  };
}
