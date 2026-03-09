import { POLICY_BLOCKLIST } from "./constants";

export function keywordScan(text: string): string[] {
  const lower = text.toLowerCase();
  return POLICY_BLOCKLIST.filter((word) => lower.includes(word));
}

export function calculateRiskScore(params: {
  isNewDeveloper: boolean;
  hasPrivacyPolicy: boolean;
  dangerousPermissionCount: number;
  keywordHits: string[];
  apkSizeMb?: number;
}): { score: number; factors: Record<string, number> } {
  const factors: Record<string, number> = {};
  let score = 0;
  if (params.isNewDeveloper) {
    factors.newDeveloper = 20;
    score += 20;
  }
  if (!params.hasPrivacyPolicy) {
    factors.noPrivacyPolicy = 30;
    score += 30;
  }
  if (params.dangerousPermissionCount > 0) {
    factors.dangerousPermissions = Math.min(50, params.dangerousPermissionCount * 10);
    score += factors.dangerousPermissions;
  }
  if (params.keywordHits.length > 0) {
    factors.suspiciousKeywords = Math.min(50, params.keywordHits.length * 25);
    score += factors.suspiciousKeywords;
  }
  if (params.apkSizeMb && params.apkSizeMb > 150) {
    factors.largeApk = 10;
    score += 10;
  }
  return { score, factors };
}
