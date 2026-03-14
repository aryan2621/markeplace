import { createHash } from "crypto";
import { getDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/firestore-collections";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function idempotencyDocId(userId: string, key: string): string {
  return createHash("sha256").update(`${userId}:${key}`).digest("hex");
}

export function validateIdempotencyKey(key: string | null): { ok: true; key: string } | { ok: false; error: string } {
  if (key === null || key === undefined || typeof key !== "string") {
    return { ok: false, error: "Idempotency-Key header is required" };
  }
  const trimmed = key.trim();
  if (trimmed.length < 1 || trimmed.length > 128) {
    return { ok: false, error: "Idempotency-Key must be between 1 and 128 characters" };
  }
  return { ok: true, key: trimmed };
}

export type TryClaimResult =
  | { cached: true; status: number; body: unknown }
  | { conflict: true }
  | { claimed: true };

export async function tryClaimIdempotencyKey(
  userId: string,
  key: string
): Promise<TryClaimResult> {
  const db = getDb();
  const docId = idempotencyDocId(userId, key);
  const col = db.collection(COLLECTIONS.idempotencyKeys);
  const ref = col.doc(docId);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (snap.exists) {
      const data = snap.data()!;
      if (data.responseBody !== undefined) {
        return {
          cached: true,
          status: (data.responseStatus as number) ?? 200,
          body: data.responseBody,
        };
      }
      if (data.pending === true) {
        return { conflict: true };
      }
    }
    const now = Date.now();
    transaction.set(ref, { createdAt: now, pending: true });
    return { claimed: true };
  });
}

export async function getIdempotentResponse(
  userId: string,
  key: string
): Promise<{ status: number; body: unknown } | null> {
  const db = getDb();
  const docId = idempotencyDocId(userId, key);
  const snap = await db.collection(COLLECTIONS.idempotencyKeys).doc(docId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const createdAt = data.createdAt as number;
  if (Date.now() - createdAt > IDEMPOTENCY_TTL_MS) return null;
  return {
    status: (data.responseStatus as number) ?? 200,
    body: data.responseBody,
  };
}

export async function setIdempotentResponse(
  userId: string,
  key: string,
  status: number,
  body: unknown
): Promise<void> {
  const db = getDb();
  const docId = idempotencyDocId(userId, key);
  await db.collection(COLLECTIONS.idempotencyKeys).doc(docId).set({
    responseStatus: status,
    responseBody: body,
    createdAt: Date.now(),
  });
}
