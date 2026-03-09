import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { DANGEROUS_PERMISSIONS } from "../constants";
import { keywordScan, calculateRiskScore } from "../risk";
import type { RiskResult, StepLogger } from "./types";

type Permission = { name: string; protectionLevel: string };

export async function calculateRiskStep(
  params: {
    slug: string;
    app: Record<string, unknown>;
    permissions: Permission[];
    db: Firestore;
    logger: StepLogger;
  }
): Promise<RiskResult> {
  const { slug, app, permissions, db, logger } = params;
  const name = (app.name as string) || "";
  const shortDesc = (app.shortDescription as string) || "";
  const keywordHits = keywordScan(`${name} ${shortDesc}`);
  const dangerousCount = permissions.filter((p) => DANGEROUS_PERMISSIONS.has(p.name)).length;
  const hasPrivacyPolicy = Boolean((app.privacyPolicyUrl as string)?.trim());
  const devSnap = await db.collection(COLLECTIONS.users).doc((app.developerId as string) ?? "").get();
  const isNewDeveloper = !devSnap.exists || (devSnap.data()?.trustScore ?? 50) >= 50;
  const { score: riskScore, factors } = calculateRiskScore({
    isNewDeveloper,
    hasPrivacyPolicy,
    dangerousPermissionCount: dangerousCount,
    keywordHits,
  });
  logger.info("Risk calculated", { slug, riskScore, factors, keywordHits });
  return { riskScore, factors, keywordHits };
}
