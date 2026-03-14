import type { ValidateDownloadUrlResult, StepLogger } from "./types";

export async function validateDownloadUrlStep(
  slug: string,
  downloadS3Key: string | undefined,
  logger: StepLogger
): Promise<ValidateDownloadUrlResult> {
  const hasKey = Boolean(downloadS3Key?.trim());
  logger.info("Validating download S3 key", { slug, hasKey });
  if (!hasKey) {
    return { valid: false, reason: "Missing APK storage key (downloadS3Key)." };
  }
  return { valid: true };
}
