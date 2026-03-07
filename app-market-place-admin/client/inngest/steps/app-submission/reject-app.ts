import type { DocumentReference } from "firebase-admin/firestore";
import { writeAuditLog } from "@/lib/audit-log";
import { sendAppSubmissionFailureEmail } from "@/lib/resend";
import type { StepLogger } from "./types";

export async function rejectAppStep(
  params: {
    slug: string;
    appRef: DocumentReference;
    app: Record<string, unknown>;
    developerEmail: string;
    riskScore: number;
    keywordHits: string[];
    logger: StepLogger;
  }
): Promise<{ rejected: true; riskScore: number }> {
  const { slug, appRef, app, developerEmail, riskScore, keywordHits, logger } = params;
  const reason =
    keywordHits.length > 0
      ? `Policy: suspicious keywords (${keywordHits.join(", ")})`
      : `Risk score too high (${riskScore}). Check privacy policy, permissions, or contact support.`;
  logger.info("Rejecting app: policy or risk", { slug, riskScore, keywordHits, reason });
  await appRef.update({
    status: "rejected",
    verificationResult: reason,
    riskScore,
    lastVerifiedAt: Date.now(),
  });
  await sendAppSubmissionFailureEmail({
    to: developerEmail,
    appName: (app.name as string) || slug,
    slug,
    reason,
  });
  await writeAuditLog({
    userId: "system",
    action: "app.submission.rejected",
    entityType: "app",
    entityId: slug,
    oldValue: "pending_review",
    newValue: "rejected",
  });
  return { rejected: true, riskScore };
}
