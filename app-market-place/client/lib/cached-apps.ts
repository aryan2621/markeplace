import { FieldPath } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { docToPublicApp } from "@/lib/public-app";
import type { PublicApp } from "@/lib/public-app";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export type AppListParams = {
  categoryId?: string;
  search?: string;
  limit: number;
  cursor?: string;
};

export type AppListResult = {
  apps: PublicApp[];
  nextCursor: string | null;
};

export async function fetchAppList(params: AppListParams): Promise<AppListResult> {
  const limit = Math.min(Math.max(1, params.limit), MAX_LIMIT);
  const db = getDb();
  const col = db.collection("apps");

  let query = col
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .orderBy(FieldPath.documentId())
    .limit(limit + 1);

  if (params.categoryId) {
    query = col
      .where("status", "==", "published")
      .where("categoryId", "==", params.categoryId)
      .orderBy("publishedAt", "desc")
      .orderBy(FieldPath.documentId())
      .limit(limit + 1);
  }

  if (params.cursor) {
    const cursorSnap = await col.doc(params.cursor).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snap = await query.get();
  let docs = snap.docs;

  if (params.search) {
    const lower = params.search.toLowerCase();
    docs = docs.filter((d) => {
      const data = d.data();
      return (
        (data.name as string)?.toLowerCase().includes(lower) ||
        (data.developer as string)?.toLowerCase().includes(lower) ||
        (data.shortDescription as string)?.toLowerCase().includes(lower)
      );
    });
  }

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const apps = page.map(docToPublicApp);
  const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].id : null;
  return { apps, nextCursor };
}

export type AppDetailResult = (PublicApp & {
  category: { id: string; name: string; slug: string } | null;
  moreFromDeveloper: PublicApp[];
}) | null;

export async function fetchAppBySlug(slug: string): Promise<AppDetailResult> {
  const db = getDb();
  const appRef = db.collection("apps").doc(slug);
  const appSnap = await appRef.get();
  if (!appSnap.exists || appSnap.data()?.status !== "published") {
    return null;
  }
  const app = docToPublicApp(appSnap);
  const doc = appSnap.data()!;
  let category: { id: string; name: string; slug: string } | null = null;
  if (doc.categoryId) {
    const catSnap = await db.collection("categories").doc(doc.categoryId).get();
    if (catSnap.exists) {
      const c = catSnap.data()!;
      category = { id: c.id, name: c.name, slug: c.slug };
    }
  }
  const publishedSnap = await db.collection("apps").where("status", "==", "published").get();
  const moreFromDeveloper = publishedSnap.docs
    .filter((d) => d.data().developer === doc.developer && d.id !== slug)
    .map(docToPublicApp);
  return { ...app, category, moreFromDeveloper };
}
