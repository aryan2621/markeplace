const SLUG_MIN_LENGTH = 1;
const SLUG_MAX_LENGTH = 100;
const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

const APPEAL_REASON_MAX_LENGTH = 5000;

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

const UPLOAD_KEY_PATTERN = /^uploads\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/;

export function validateUploadKey(key: string): { ok: true } | { ok: false; error: string } {
  if (typeof key !== "string" || !key.trim()) {
    return { ok: false, error: "storageId or key required" };
  }
  const trimmed = key.trim();
  if (trimmed.includes("..")) {
    return { ok: false, error: "invalid path" };
  }
  if (!trimmed.startsWith("uploads/")) {
    return { ok: false, error: "path must start with uploads/" };
  }
  if (!UPLOAD_KEY_PATTERN.test(trimmed)) {
    return { ok: false, error: "path must match uploads/[id] or uploads/[id].[ext]" };
  }
  return { ok: true };
}

export function validateAppealReason(reason: string | undefined): {
  ok: true;
  value: string;
} | { ok: false; error: string } {
  const value = typeof reason === "string" ? reason.trim() : "";
  if (value.length > APPEAL_REASON_MAX_LENGTH) {
    return { ok: false, error: `reason must be at most ${APPEAL_REASON_MAX_LENGTH} characters` };
  }
  return { ok: true, value: value || "Appeal submitted." };
}
