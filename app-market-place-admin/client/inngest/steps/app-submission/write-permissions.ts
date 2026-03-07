import type { Firestore } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore-collections";
import type { StepLogger } from "./types";

type Permission = { name: string; protectionLevel: string };

export async function writePermissionsStep(
  params: {
    slug: string;
    db: Firestore;
    appRef: DocumentReference;
    permissions: Permission[];
    packageName: string | null;
    logger: StepLogger;
  }
): Promise<{ permissionsWritten: number }> {
  const { slug, db, appRef, permissions, packageName, logger } = params;
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
  if (packageName !== null) {
    await appRef.update({ packageName, lastVerifiedAt: Date.now() });
  }
  return { permissionsWritten: permissions.length };
}
