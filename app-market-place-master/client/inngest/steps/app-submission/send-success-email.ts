import { sendAppSubmissionSuccessEmail } from "@/lib/email";
import type { StepLogger } from "./types";

export async function sendSuccessEmailStep(
  params: {
    slug: string;
    app: Record<string, unknown>;
    developerEmail: string;
    logger: StepLogger;
  }
): Promise<{ sent: true }> {
  const { slug, app, developerEmail, logger } = params;
  logger.info("Sending submission success email to developer", { slug, to: developerEmail });
  await sendAppSubmissionSuccessEmail({
    to: developerEmail,
    appName: (app.name as string) || slug,
    slug,
  });
  return { sent: true };
}
