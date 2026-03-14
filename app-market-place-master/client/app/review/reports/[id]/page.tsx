"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getReport, resolveReport } from "@/lib/review-client";
import type { Report } from "@/lib/review-client";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

function formatTimestamp(ts: number | null): string {
  if (ts == null) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setReport(null);
      return;
    }
    let cancelled = false;
    getReport(id)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleResolve(action: "resolved" | "dismissed") {
    if (!id) return;
    setResolving(true);
    setError(null);
    try {
      await resolveReport(id, { action, note: resolutionNote.trim() || undefined });
      router.push("/review/reports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve report");
    } finally {
      setResolving(false);
    }
  }

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-muted-foreground">Invalid report ID.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/review/reports">Back to Reports</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Loader />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/review/reports">Back to Reports</Link>
        </Button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-muted-foreground">Report not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/review/reports">Back to Reports</Link>
        </Button>
      </div>
    );
  }

  const isPending = report.status === "pending";

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/review/reports">← Back to Reports</Link>
        </Button>
      </div>
      <h1 className="text-xl font-semibold tracking-tight mb-6">Report {report.id.slice(0, 8)}</h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base">App: {report.appSlug || report.appId}</CardTitle>
            <Badge variant={isPending ? "default" : "secondary"}>{report.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Reporter email:</span> {report.reporterEmail ?? "—"}</p>
          <p><span className="text-muted-foreground">Reason:</span> {report.reason ?? "—"}</p>
          <p><span className="text-muted-foreground">Created:</span> {formatTimestamp(report.createdAt)}</p>
          {report.resolvedAt != null && (
            <>
              <p><span className="text-muted-foreground">Resolved:</span> {formatTimestamp(report.resolvedAt)}</p>
              <p><span className="text-muted-foreground">Resolved by:</span> {report.resolvedBy ?? "—"}</p>
              {report.resolutionNote && (
                <p><span className="text-muted-foreground">Note:</span> {report.resolutionNote}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolve or dismiss</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="resolution-note" className="text-sm font-medium mb-1 block">Note (optional)</label>
              <Textarea
                id="resolution-note"
                placeholder="Resolution note"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleResolve("resolved")}
                disabled={resolving}
              >
                {resolving ? "Resolving…" : "Resolve"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleResolve("dismissed")}
                disabled={resolving}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
