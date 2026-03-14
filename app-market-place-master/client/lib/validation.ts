const SLUG_MIN_LENGTH = 1;
const SLUG_MAX_LENGTH = 100;
const SLUG_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const REJECT_FEEDBACK_MAX_LENGTH = 5000;

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

export function validateDownloadKey(key: string): { ok: true } | { ok: false; error: string } {
  if (typeof key !== "string" || !key.trim()) {
    return { ok: false, error: "Download key required" };
  }
  const trimmed = key.trim();
  if (trimmed.includes("..") || !trimmed.startsWith("uploads/")) {
    return { ok: false, error: "Invalid download key" };
  }
  const ONE_SEGMENT = /^uploads\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/;
  const USER_SCOPED = /^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/;
  if (!ONE_SEGMENT.test(trimmed) && !USER_SCOPED.test(trimmed)) {
    return { ok: false, error: "Invalid download key" };
  }
  return { ok: true };
}
