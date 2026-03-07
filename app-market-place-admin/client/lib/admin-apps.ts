import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firestore-collections";

/**
 * Returns the app document snapshot if it exists and is owned by userId; otherwise null.
 */
export async function getAppIfOwned(
  db: Firestore,
  slug: string,
  userId: string
): Promise<DocumentSnapshot | null> {
  const snap = await db.collection(COLLECTIONS.apps).doc(slug).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.developerId !== userId) return null;
  return snap;
}
