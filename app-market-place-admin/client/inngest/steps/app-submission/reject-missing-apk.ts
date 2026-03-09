import type { Firestore } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { writeAuditLog } from "@/lib/audit-log";
import { sendAppSubmissionFailureEmail } from "@/lib/email";
import type { StepLogger } from "./types";

export async function rejectMissingApkStep(
  params: {
    slug: string;
    db: Firestore;
    appRef: DocumentReference;
    app: Record<string, unknown>;
    developerEmail: string;
    reason: string;
    logger: StepLogger;
  }
): Promise<{ rejected: true; reason: string }> {
  const { slug, db, appRef, app, developerEmail, reason, logger } = params;
  logger.info("Rejecting app: missing APK download URL", { slug, reason });
  await appRef.update({
    status: "rejected",
    verificationResult: reason,
    lastVerifiedAt: Date.now(),
  });
  await db.collection(COLLECTIONS.riskLogs).add({
    appId: slug,
    riskScore: 100,
    factors: { missingApk: 100 },
    createdAt: Date.now(),
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
  return { rejected: true, reason: "missing_apk" };
}
