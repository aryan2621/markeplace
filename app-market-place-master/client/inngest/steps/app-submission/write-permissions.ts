import type { Firestore } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore-collections";
import type { StepLogger } from "./types";

type Permission = { name: string; protectionLevel: string };

function toVersionCode(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

export async function writePermissionsStep(
  params: {
    slug: string;
    db: Firestore;
    appRef: DocumentReference;
    permissions: Permission[];
    packageName: string | null;
    version?: string | null;
    versionCode?: number | string | null;
    logger: StepLogger;
  }
): Promise<{ permissionsWritten: number }> {
  const { slug, db, appRef, permissions, packageName, version, versionCode, logger } = params;
  logger.info("Writing permissions to store", { slug, count: permissions.length });
  const batch = db.batch();
  const permColl = db.collection(COLLECTIONS.appPermissions);
  const existingPerms = await db.collection(COLLECTIONS.appPermissions).where("appId", "==", slug).get();
  existingPerms.docs.forEach((d) => batch.delete(d.ref));
  permissions.forEach((p) => {
    const ref = permColl.doc();
    batch.set(ref, { appId: slug, permissionName: p.name, protectionLevel: p.protectionLevel || "unknown" });
  });
  await batch.commit();
  const appUpdate: Record<string, unknown> = { lastVerifiedAt: Date.now() };
  if (packageName !== null && packageName !== undefined) appUpdate.packageName = packageName;
  if (version !== null && version !== undefined && String(version).trim() !== "") appUpdate.version = String(version).trim();
  const code = toVersionCode(versionCode);
  if (code !== null) appUpdate.versionCode = code;
  if (Object.keys(appUpdate).length > 1) {
    await appRef.update(appUpdate);
  }
  return { permissionsWritten: permissions.length };
}
