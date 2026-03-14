"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getReviewAppDetail,
  approveApp,
  rejectApp,
  requestChanges,
} from "@/lib/review-client";
import type { ReviewAppDetail as Detail } from "@/lib/review-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader } from "@/components/ui/loader";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Package,
  Shield,
  AlertTriangle,
  ClipboardCheck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RISK_FACTOR_LABELS: Record<string, string> = {
  newDeveloper: "New developer",
  noPrivacyPolicy: "No privacy policy",
  dangerousPermissions: "Dangerous permissions",
  suspiciousKeywords: "Suspicious keywords",
  largeApk: "Large APK",
  missingApk: "Missing APK",
};

function ReviewStep({
  icon: Icon,
  status,
  title,
  result,
}: {
  icon: React.ComponentType<{ className?: string }>;
  status: "pass" | "fail" | "warn" | "info";
  title: string;
  result: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          status === "pass" && "bg-green-500/20 text-green-600 dark:text-green-400",
          status === "fail" && "bg-destructive/20 text-destructive",
          status === "warn" && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
          status === "info" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
        <div className="font-medium text-sm break-words">{title}</div>
        <div className="text-sm break-words overflow-hidden">{result}</div>
      </div>
    </div>
  );
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"idle" | "approve" | "reject" | "request-changes">("idle");
  const [rejectReason, setRejectReason] = useState("");
  const [changeFeedback, setChangeFeedback] = useState("");

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getReviewAppDetail(slug)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleApprove() {
    if (!slug) return;
    setAction("approve");
    try {
      await approveApp(slug);
      router.push("/review");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setAction("idle");
    }
  }

  async function handleReject() {
    if (!slug) return;
    setAction("reject");
    try {
      await rejectApp(slug, rejectReason || "Rejected by reviewer.");
      router.push("/review");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setAction("idle");
    }
  }

  async function handleRequestChanges() {
    if (!slug) return;
    setAction("request-changes");
    try {
      await requestChanges(slug, changeFeedback || "Please make the requested changes and resubmit.");
      router.push("/review");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request changes");
    } finally {
      setAction("idle");
    }
  }

  if (!slug) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Invalid app.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/review">Back to queue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/review">← Back to queue</Link>
        </Button>
      </div>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading && <Loader />}
        {!loading && data && (
          <div className="space-y-6">
            <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-5 min-w-0 overflow-hidden">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-lg font-semibold leading-tight">
                        {data.app.name}
                      </CardTitle>
                      {data.app.riskScore != null && (
                        <Badge variant="secondary" className="shrink-0">
                          Risk: {data.app.riskScore}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {data.app.packageName ?? data.app.slug} · {data.app.developer}
                    </p>
                    {data.app.developerEmail && (
                      <p className="text-sm text-muted-foreground">
                        <a
                          href={`mailto:${data.app.developerEmail}`}
                          className="text-primary hover:underline"
                        >
                          {data.app.developerEmail}
                        </a>
                      </p>
                    )}
                    {data.app.shortDescription && (
                      <p className="text-sm text-foreground pt-0.5 break-words">
                        {data.app.shortDescription}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 sm:pt-0 sm:flex-col sm:items-end">
                    {data.app.privacyPolicyUrl && (
                      <a
                        href={data.app.privacyPolicyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline underline-offset-4 hover:no-underline break-all"
                      >
                        Privacy policy
                      </a>
                    )}
                    {(() => {
                      const base = (process.env.NEXT_PUBLIC_MARKETPLACE_APP_BASE_URL ?? "").replace(/\/$/, "");
                      const href = base ? `${base}/api/apps/${data.app.slug}/download` : null;
                      return href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline break-all"
                        >
                          Download APK
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Download (set NEXT_PUBLIC_MARKETPLACE_APP_BASE_URL for link)</span>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6 min-w-0">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="size-4" />
                  Submission & review steps
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Checks and results from submission and automated review
                </p>
              </CardHeader>
              <CardContent className="space-y-4 min-w-0 overflow-hidden">
                <ReviewStep
                  icon={Package}
                  status="info"
                  title="APK download"
                  result={
                    (() => {
                      const base = (process.env.NEXT_PUBLIC_MARKETPLACE_APP_BASE_URL ?? "").replace(/\/$/, "");
                      const href = base ? `${base}/api/apps/${data.app.slug}/download` : null;
                      return href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 text-sm"
                        >
                          Open download link
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">Set NEXT_PUBLIC_MARKETPLACE_APP_BASE_URL for link</span>
                      );
                    })()
                  }
                />

                <ReviewStep
                  icon={data.app.privacyPolicyUrl ? CheckCircle2 : AlertCircle}
                  status={data.app.privacyPolicyUrl ? "pass" : "warn"}
                  title="Privacy policy"
                  result={
                    data.app.privacyPolicyUrl ? (
                      <a
                        href={data.app.privacyPolicyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 text-sm"
                      >
                        Present — open link
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not provided</span>
                    )
                  }
                />

                <ReviewStep
                  icon={Package}
                  status="info"
                  title="Package name"
                  result={
                    <span className="text-sm">
                      {data.app.packageName ?? (
                        <span className="text-muted-foreground">Not extracted</span>
                      )}
                    </span>
                  }
                />

                <ReviewStep
                  icon={Package}
                  status="info"
                  title="Version"
                  result={
                    <span className="text-sm">
                      {data.app.version != null && data.app.version !== "" ? (
                        <>
                          {data.app.version}
                          {data.app.versionCode != null && (
                            <> (version code {data.app.versionCode})</>
                          )}
                        </>
                      ) : data.app.versionCode != null ? (
                        <>Version code {data.app.versionCode}</>
                      ) : (
                        <span className="text-muted-foreground">Not extracted</span>
                      )}
                    </span>
                  }
                />

                <ReviewStep
                  icon={Shield}
                  status="info"
                  title="Permissions"
                  result={
                    <div className="text-sm">
                      <span className="font-medium">{data.permissions.length}</span> permission
                      {data.permissions.length !== 1 ? "s" : ""} extracted
                      {data.permissions.length > 0 && (
                        <ul className="mt-2 list-disc list-inside space-y-0.5 text-muted-foreground">
                          {data.permissions.slice(0, 12).map((p, i) => (
                            <li key={i}>
                              {p.permissionName}
                              {p.protectionLevel ? ` (${p.protectionLevel})` : ""}
                            </li>
                          ))}
                          {data.permissions.length > 12 && (
                            <li>+{data.permissions.length - 12} more</li>
                          )}
                        </ul>
                      )}
                    </div>
                  }
                />

                {data.latestRisk && (
                  <ReviewStep
                    icon={data.latestRisk.riskScore > 80 ? AlertTriangle : CheckCircle2}
                    status={data.latestRisk.riskScore > 80 ? "fail" : "pass"}
                    title="Risk assessment"
                    result={
                      <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Score: {data.latestRisk.riskScore}</span>
                          <Badge
                            variant={data.latestRisk.riskScore > 80 ? "destructive" : "secondary"}
                          >
                            {data.latestRisk.riskScore > 80 ? "High risk" : "Within policy"}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          Factors:{" "}
                          {Object.entries(data.latestRisk.factors).length === 0 ? (
                            "None"
                          ) : (
                            <ul className="mt-1 list-disc list-inside space-y-0.5">
                              {Object.entries(data.latestRisk.factors).map(([key, value]) => (
                                <li key={key}>
                                  {RISK_FACTOR_LABELS[key] ?? key}: {value}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    }
                  />
                )}

                <ReviewStep
                  icon={
                    data.app.verificationResult?.toLowerCase().includes("keyword") ||
                    data.app.verificationResult?.toLowerCase().includes("suspicious")
                      ? XCircle
                      : CheckCircle2
                  }
                  status={
                    data.app.verificationResult?.toLowerCase().includes("keyword") ||
                    data.app.verificationResult?.toLowerCase().includes("suspicious")
                      ? "fail"
                      : "pass"
                  }
                  title="Policy / keywords"
                  result={
                    <span className="text-sm break-words block">
                      {data.app.verificationResult?.toLowerCase().includes("keyword") ||
                      data.app.verificationResult?.toLowerCase().includes("suspicious") ? (
                        <span className="text-destructive break-words">
                          {data.app.verificationResult}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No policy violations detected</span>
                      )}
                    </span>
                  }
                />

                <ReviewStep
                  icon={Calendar}
                  status="info"
                  title="Verification outcome"
                  result={
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        <Badge variant="secondary">{data.app.status}</Badge>
                      </div>
                      {data.app.lastVerifiedAt && (
                        <div className="text-muted-foreground">
                          Last verified:{" "}
                          {new Date(Number(data.app.lastVerifiedAt)).toLocaleString()}
                        </div>
                      )}
                      {data.app.submittedAt && (
                        <div className="text-muted-foreground">
                          Submitted:{" "}
                          {new Date(Number(data.app.submittedAt)).toLocaleString()}
                        </div>
                      )}
                      {(data.app.verificationResult || data.app.rejectionReason) && (
                        <div className="mt-2 rounded-md bg-muted p-2 break-words overflow-hidden">
                          <span className="font-medium block mb-1">Result / reason:</span>
                          <span className="text-muted-foreground break-words">
                            {data.app.verificationResult ?? data.app.rejectionReason}
                          </span>
                        </div>
                      )}
                    </div>
                  }
                />

                {data.dataSafety && Object.keys(data.dataSafety).length > 0 && (
                  <ReviewStep
                    icon={FileText}
                    status="info"
                    title="Data safety"
                    result={
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-32">
                        {JSON.stringify(data.dataSafety, null, 2)}
                      </pre>
                    }
                  />
                )}
              </CardContent>
            </Card>
            </div>

            <div className="space-y-6 lg:sticky lg:top-4 lg:self-start min-w-0">
              {data.permissions.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Permissions (full list)</CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 overflow-hidden">
                    <ul className="text-sm list-disc list-inside space-y-1 max-h-64 overflow-y-auto break-words">
                      {data.permissions.map((p, i) => (
                        <li key={i}>
                          {p.permissionName}
                          {p.protectionLevel ? ` — ${p.protectionLevel}` : ""}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {data.latestRisk && (
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Risk factors (raw)</CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 overflow-hidden">
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48 break-words">
                      {JSON.stringify(data.latestRisk.factors, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 min-w-0 overflow-hidden">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={action !== "idle"}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {action === "approve" ? "Publishing…" : "Approve & publish"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={action !== "idle"}
                    >
                      {action === "reject" ? "Rejecting…" : "Reject"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Reject reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Request changes (feedback to developer)"
                      value={changeFeedback}
                      onChange={(e) => setChangeFeedback(e.target.value)}
                      rows={3}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleRequestChanges}
                      disabled={action !== "idle"}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {action === "request-changes" ? "Sending…" : "Request changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          </div>
        )}
    </div>
  );
}
