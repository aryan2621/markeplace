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

const UPLOAD_KEY_ONE_SEGMENT = /^uploads\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/;
const UPLOAD_KEY_USER_SCOPED = /^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/;

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
  if (!UPLOAD_KEY_ONE_SEGMENT.test(trimmed) && !UPLOAD_KEY_USER_SCOPED.test(trimmed)) {
    return { ok: false, error: "path must match uploads/[id].[ext] or uploads/[userId]/[id].[ext]" };
  }
  return { ok: true };
}

/** Validates key format and that the key belongs to the given user (uploads/{userId}/...). */
export function validateUploadKeyOwnership(
  key: string,
  userId: string
): { ok: true } | { ok: false; error: string } {
  const format = validateUploadKey(key);
  if (!format.ok) return format;
  const trimmed = key.trim();
  const prefix = `uploads/${userId}/`;
  if (!trimmed.startsWith(prefix)) {
    return { ok: false, error: "You can only use storage keys that belong to your account" };
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
