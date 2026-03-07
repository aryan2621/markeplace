import type { DocumentReference } from "firebase-admin/firestore";
import type { StepLogger } from "./types";

export async function setInReviewStep(
  slug: string,
  appRef: DocumentReference,
  riskScore: number,
  logger: StepLogger
): Promise<{ status: string }> {
  logger.info("Setting app status to in_review", { slug, riskScore });
  await appRef.update({
    status: "in_review",
    riskScore,
    lastVerifiedAt: Date.now(),
  });
  return { status: "in_review" };
}
