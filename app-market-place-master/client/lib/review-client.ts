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
    downloadUrl?: string | null;
    verificationResult?: string | null;
    rejectionReason?: string | null;
    lastVerifiedAt?: string | null;
    packageName?: string | null;
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
