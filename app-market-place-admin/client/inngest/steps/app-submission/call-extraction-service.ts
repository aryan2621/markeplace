import { EXTRACTION_SERVICE_URL } from "../constants";
import type { ExtractionResult, StepLogger } from "./types";

export async function callExtractionServiceStep(
  slug: string,
  downloadUrl: string,
  logger: StepLogger
): Promise<ExtractionResult> {
  logger.info("Calling extraction service", { slug, url: EXTRACTION_SERVICE_URL });
  const res = await fetch(`${EXTRACTION_SERVICE_URL.replace(/\/$/, "")}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apkUrl: downloadUrl, appSlug: slug }),
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error("Extraction service failed", { slug, status: res.status, err });
    throw new Error(`Extraction failed: ${res.status} ${err}`);
  }
  const body = (await res.json()) as ExtractionResult;
  logger.info("Extraction completed", {
    slug,
    packageName: body.packageName ?? null,
    permissionCount: body.permissions?.length ?? 0,
  });
  return body;
}
