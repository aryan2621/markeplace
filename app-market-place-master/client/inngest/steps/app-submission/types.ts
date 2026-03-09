import type { Firestore } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";

export type StepLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type LoadAppResult =
  | { skip: true; status: string }
  | { skip: false; app: Record<string, unknown>; id: string };

export type ValidateDownloadUrlResult =
  | { valid: true }
  | { valid: false; reason: string };

export type ExtractionResult = {
  packageName?: string | null;
  permissions?: { name: string; protectionLevel?: string }[];
};

export type RiskResult = {
  riskScore: number;
  factors: Record<string, number>;
  keywordHits: string[];
};

export type RunContext = {
  slug: string;
  db: Firestore;
  appRef: DocumentReference;
  app: Record<string, unknown>;
  appId: string;
  developerEmail: string;
};
