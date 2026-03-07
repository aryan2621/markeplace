import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore-collections";
import type { StepLogger } from "./types";

export async function persistRiskLogStep(
  params: {
    slug: string;
    db: Firestore;
    riskScore: number;
    factors: Record<string, number>;
    logger: StepLogger;
  }
): Promise<{ persisted: true }> {
  const { slug, db, riskScore, factors, logger } = params;
  logger.info("Persisting risk log", { slug, riskScore });
  await db.collection(COLLECTIONS.riskLogs).add({
    appId: slug,
    riskScore,
    factors,
    createdAt: Date.now(),
  });
  return { persisted: true };
}
