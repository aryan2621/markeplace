/**
 * Structured API logging for request/response/error and step-level debugging.
 * Single-line format for log aggregation; no PII (bodies, tokens, emails).
 */

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

export function logRequest(
  route: string,
  method: string,
  meta?: Record<string, unknown>
): void {
  console.info(
    `[API][${route}] request: ${method}${formatMeta(meta)}`
  );
}

export function logStep(
  route: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  console.info(
    `[API][${route}] step: ${message}${formatMeta(meta)}`
  );
}

export function logResponse(
  route: string,
  status: number,
  durationMs: number,
  meta?: Record<string, unknown>
): void {
  const payload = { ...meta, status, durationMs };
  console.info(
    `[API][${route}] response: ${status} ${durationMs}ms${formatMeta(payload)}`
  );
}

export function logError(
  route: string,
  error: unknown,
  meta?: { status?: number; durationMs?: number }
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const payload = {
    ...meta,
    error: message,
    ...(stack && { stack }),
  };
  console.error(
    `[API][${route}] error: ${message}${formatMeta(payload)}`
  );
}
