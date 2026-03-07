import type {
  App,
  Category,
  CreateAppInput,
  UpdateAppInput,
} from "@/lib/models";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data?.error as string) ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function getCategories(): Promise<Category[]> {
  return fetchJson<Category[]>("/api/admin/categories");
}

export async function getApps(params?: {
  search?: string;
  categoryId?: string;
}): Promise<App[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  const q = searchParams.toString();
  return fetchJson<App[]>(`/api/admin/apps${q ? `?${q}` : ""}`);
}

export async function getAppBySlug(slug: string): Promise<App | null> {
  const res = await fetch(`/api/admin/apps/${encodeURIComponent(slug)}`, { credentials: "include" });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data?.error as string) ?? res.statusText);
  }
  return res.json() as Promise<App>;
}

export type DeveloperInfo = {
  verified: boolean;
  developerStatus: string;
  githubUsername: string | null;
  trustScore: number;
  strikeCount: number;
};

export async function getDeveloper(): Promise<DeveloperInfo> {
  return fetchJson<DeveloperInfo>("/api/admin/developer");
}

export async function createApp(input: CreateAppInput): Promise<App> {
  return fetchJson<App>("/api/admin/apps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateApp(slug: string, input: UpdateAppInput): Promise<App> {
  return fetchJson<App>(`/api/admin/apps/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function submitForReview(slug: string): Promise<{ ok: boolean; message: string; submittedAt: number }> {
  return fetchJson<{ ok: boolean; message: string; submittedAt: number }>(
    `/api/admin/apps/${encodeURIComponent(slug)}/submit`,
    { method: "POST", credentials: "include" }
  );
}

export async function uploadFile(file: File): Promise<{ url: string; key: string }> {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data?.error as string) ?? "Failed to get upload URL");
  }
  const { uploadUrl, key, readUrl, contentType } = (await res.json()) as {
    uploadUrl: string;
    key: string;
    readUrl: string;
    contentType?: string;
  };
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType ?? file.type ?? "application/octet-stream",
    },
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status} ${putRes.statusText}`);
  }
  return { url: readUrl, key };
}

export type { App, Category, CreateAppInput, UpdateAppInput };
