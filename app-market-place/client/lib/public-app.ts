import type { DocumentSnapshot } from "firebase-admin/firestore";

/**
 * Public app shape for marketplace APIs. Excludes PII and internal fields.
 */
export type PublicApp = {
  id: string;
  slug: string;
  name: string;
  developer: string;
  shortDescription: string;
  description: string;
  icon: string;
  screenshots: string[];
  videoUrl: string | null;
  downloadCount: string;
  platform: string;
  categoryId: string;
  rating: number | null;
  size: string | null;
  downloadUrl: string | null;
  version: string | null;
  versionCode: number | null;
  publishedAt: string | null;
};

export function docToPublicApp(doc: DocumentSnapshot): PublicApp {
  const d = doc.data()!;
  return {
    id: doc.id,
    slug: d.slug,
    name: d.name,
    developer: d.developer,
    shortDescription: d.shortDescription,
    description: d.description,
    icon: d.icon,
    screenshots: d.screenshots ?? [],
    videoUrl: d.videoUrl ?? null,
    downloadCount: d.downloadCount,
    platform: d.platform,
    categoryId: d.categoryId,
    rating: d.rating ?? null,
    size: d.size ?? null,
    downloadUrl: d.downloadUrl ?? null,
    version: d.version ?? null,
    versionCode: d.versionCode ?? null,
    publishedAt: d.publishedAt != null ? String(d.publishedAt) : null,
  };
}
