import type { Platform } from "@/lib/constants";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type AppStatus = "draft" | "in_review" | "pending_review" | "rejected" | "published" | "suspended";

export type App = {
  id: string;
  slug: string;
  name: string;
  developer: string;
  shortDescription: string;
  description: string;
  icon: string;
  screenshots: string[];
  videoUrl?: string | null;
  downloadCount: string;
  platform: Platform;
  categoryId: string;
  rating?: number | null;
  size?: string | null;
  category?: Category | null;
  downloadS3Key?: string | null;
  version?: string | null;
  versionCode?: number | null;
  status?: AppStatus;
  rejectionReason?: string | null;
  verificationResult?: string | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  developerEmail?: string;
  riskScore?: number | null;
  lastVerifiedAt?: string | null;
  packageName?: string | null;
  privacyPolicyUrl?: string | null;
  developerId?: string | null;
  githubUsername?: string | null;
  githubId?: string | null;
  reviewNotes?: string | null;
  featureGraphic?: string | null;
  apkFile?: string | null;
  targetSdk?: number | null;
  minSdk?: number | null;
  containsAds?: boolean | null;
  containsIap?: boolean | null;
  containsSubscription?: boolean | null;
  externalPaymentLinks?: boolean | null;
  contentRating?: string | null;
};

export type AppDataSafety = {
  appId: string;
  collectsPersonalData: boolean;
  dataTypesCollected: string[];
  dataShared: boolean;
  encryptionUsed: boolean;
  privacyPolicyUrl: string;
};

export type AppPermission = {
  appId: string;
  permissionName: string;
  protectionLevel: string;
  justification?: string | null;
};

export type RiskLog = {
  appId: string;
  riskScore: number;
  factors: Record<string, number>;
  createdAt: number;
};

export type AuditLog = {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
};

export type DeveloperStatus = "pending_verification" | "verified" | "suspended";

export type Developer = {
  id: string;
  userId: string;
  developerStatus: DeveloperStatus;
  trustScore: number;
  strikeCount: number;
  githubId?: string | null;
  githubUsername?: string | null;
  createdAt: number;
};

export type DeveloperStrike = {
  developerId: string;
  appId: string;
  reason: string;
  severity: "warning" | "temp_suspend" | "permanent";
  createdAt: number;
};

export type CreateAppInput = {
  name: string;
  slug: string;
  developer: string;
  developerEmail: string;
  shortDescription: string;
  description: string;
  icon: string;
  screenshots: string[];
  videoUrl?: string | null;
  downloadCount: string;
  platform: Platform;
  categoryId: string;
  rating?: number | null;
  size?: string | null;
  featuredOrder?: number | null;
  downloadS3Key: string;
  version?: string | null;
  versionCode?: number | null;
  packageName?: string | null;
  privacyPolicyUrl?: string | null;
  featureGraphic?: string | null;
  apkFile?: string | null;
  containsAds?: boolean | null;
  containsIap?: boolean | null;
  containsSubscription?: boolean | null;
  externalPaymentLinks?: boolean | null;
  contentRating?: string | null;
  collectsPersonalData?: boolean | null;
  dataTypesCollected?: string[] | null;
  dataShared?: boolean | null;
  encryptionUsed?: boolean | null;
};

/** Admin can only set draft; pending_review is set by submit API. published/rejected/suspended are Master-only. */
export type UpdateAppInput = {
  name?: string | null;
  developer?: string | null;
  developerEmail?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  icon?: string | null;
  screenshots?: string[] | null;
  videoUrl?: string | null;
  downloadCount?: string | null;
  platform?: Platform | null;
  categoryId?: string | null;
  rating?: number | null;
  size?: string | null;
  featuredOrder?: number | null;
  downloadS3Key?: string | null;
  version?: string | null;
  versionCode?: number | null;
  packageName?: string | null;
  privacyPolicyUrl?: string | null;
  featureGraphic?: string | null;
  apkFile?: string | null;
  containsAds?: boolean | null;
  containsIap?: boolean | null;
  containsSubscription?: boolean | null;
  externalPaymentLinks?: boolean | null;
  contentRating?: string | null;
  collectsPersonalData?: boolean | null;
  dataTypesCollected?: string[] | null;
  dataShared?: boolean | null;
  encryptionUsed?: boolean | null;
  status?: "draft";
};
