import { writeAuditLog } from "@/lib/audit-log";
import type { StepLogger } from "./types";

export async function auditInReviewStep(
  slug: string,
  logger: StepLogger
): Promise<{ audited: true }> {
  logger.info("Writing audit log: in_review", { slug });
  await writeAuditLog({
    userId: "system",
    action: "app.submission.in_review",
    entityType: "app",
    entityId: slug,
    oldValue: "pending_review",
    newValue: "in_review",
  });
  return { audited: true };
}
