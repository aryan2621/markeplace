import type { ValidateDownloadUrlResult, StepLogger } from "./types";

export async function validateDownloadUrlStep(
  slug: string,
  downloadUrl: string | undefined,
  logger: StepLogger
): Promise<ValidateDownloadUrlResult> {
  const hasUrl = Boolean(downloadUrl?.trim());
  logger.info("Validating download URL", { slug, hasUrl });
  if (!hasUrl) {
    return { valid: false, reason: "Missing download URL (APK)." };
  }
  return { valid: true };
}
