import { getDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/firestore-collections";

export async function writeAuditLog(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
}): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.auditLogs).add({
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValue: params.oldValue,
    newValue: params.newValue,
    timestamp: Date.now(),
  });
}
