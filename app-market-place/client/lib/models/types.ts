import type { Platform } from "@/lib/constants";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface App {
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
  version?: string | null;
  versionCode?: number | null;
}

export interface AppDetail extends App {
  category: Category | null;
  moreFromDeveloper: App[];
}
