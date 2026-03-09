/**
 * Firestore collection names. Use these constants instead of string literals
 * for type safety and refactoring.
 */
export const COLLECTIONS = {
  apps: "apps",
  categories: "categories",
  appReports: "appReports",
  appDataSafety: "appDataSafety",
  appPermissions: "appPermissions",
  riskLogs: "riskLogs",
  auditLogs: "auditLogs",
  users: "users",
  developerStrikes: "developerStrikes",
  appAppeals: "appAppeals",
  settings: "settings",
} as const;
