async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data?.error as string) ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export type ReviewApp = {
  id: string;
  slug: string;
  name: string;
  developer: string;
  shortDescription: string;
  status: string;
  riskScore: number | null;
  submittedAt: string | null;
  developerEmail?: string;
};

export async function getReviewApps(status?: string): Promise<ReviewApp[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson<ReviewApp[]>(`/api/review/apps${q}`);
}

export type ReviewAppDetail = {
  app: ReviewApp & {
    privacyPolicyUrl?: string | null;
    verificationResult?: string | null;
    rejectionReason?: string | null;
    lastVerifiedAt?: string | null;
    packageName?: string | null;
    version?: string | null;
    versionCode?: number | null;
  };
  dataSafety: Record<string, unknown> | null;
  permissions: { permissionName: string; protectionLevel?: string }[];
  latestRisk: { riskScore: number; factors: Record<string, number> } | null;
};

export async function getReviewAppDetail(slug: string): Promise<ReviewAppDetail> {
  return fetchJson<ReviewAppDetail>(`/api/review/apps/${encodeURIComponent(slug)}`);
}

export async function approveApp(slug: string): Promise<{ ok: boolean; publishedAt: number }> {
  return fetchJson(`/api/review/apps/${encodeURIComponent(slug)}/approve`, { method: "POST", credentials: "include" });
}

export async function rejectApp(slug: string, reason: string): Promise<{ ok: boolean }> {
  return fetchJson(`/api/review/apps/${encodeURIComponent(slug)}/reject`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

export async function requestChanges(slug: string, feedback: string): Promise<{ ok: boolean }> {
  return fetchJson(`/api/review/apps/${encodeURIComponent(slug)}/request-changes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
}

export type Report = {
  id: string;
  appId: string;
  appSlug: string;
  reporterEmail: string | null;
  reason: string | null;
  status: string;
  createdAt: number | null;
  resolvedAt: number | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
};

export async function getReports(params?: {
  status?: string;
  appSlug?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ reports: Report[]; nextCursor: string | null }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.appSlug) searchParams.set("appSlug", params.appSlug);
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const q = searchParams.toString();
  return fetchJson<{ reports: Report[]; nextCursor: string | null }>(
    `/api/review/reports${q ? `?${q}` : ""}`
  );
}

export async function getReport(id: string): Promise<Report> {
  return fetchJson<Report>(`/api/review/reports/${encodeURIComponent(id)}`);
}

export async function resolveReport(
  id: string,
  params: { action: "resolved" | "dismissed"; note?: string }
): Promise<{ ok: boolean; status: string; resolvedAt: number }> {
  return fetchJson(`/api/review/reports/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: params.action, note: params.note }),
  });
}
