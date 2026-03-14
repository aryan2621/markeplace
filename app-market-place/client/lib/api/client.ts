import type { App, AppDetail, Category } from "@/lib/models";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data?.error as string) ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function getCategories(): Promise<Category[]> {
  return fetchJson<Category[]>("/api/categories");
}

export type AppsResponse = { apps: App[]; nextCursor: string | null };

export async function getApps(params?: {
  categoryId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}): Promise<AppsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const q = searchParams.toString();
  return fetchJson<AppsResponse>(`/api/apps${q ? `?${q}` : ""}`);
}

export async function getFeaturedApps(): Promise<App[]> {
  return fetchJson<App[]>("/api/apps/featured");
}

export async function getAppDetailBySlug(slug: string): Promise<AppDetail | null> {
  const res = await fetch(`/api/apps/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data?.error as string) ?? res.statusText);
  }
  return res.json() as Promise<AppDetail>;
}

export async function reportApp(params: {
  appId: string;
  appSlug: string;
  reason?: string;
  reporterEmail?: string;
}): Promise<{ message: string }> {
  return fetchJson<{ message: string }>("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

