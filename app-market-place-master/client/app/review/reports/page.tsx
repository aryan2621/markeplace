"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReports } from "@/lib/review-client";
import type { Report } from "@/lib/review-client";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

function formatTimestamp(ts: number | null): string {
  if (ts == null) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function ReportsListPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [appSlugFilter, setAppSlugFilter] = useState("");
  const [appSlugInput, setAppSlugInput] = useState("");

  function loadReports(cursor?: string, append = false) {
    const params: { status?: string; appSlug?: string; limit: number; cursor?: string } = {
      limit: 20,
    };
    if (statusFilter !== "all") params.status = statusFilter;
    if (appSlugFilter.trim()) params.appSlug = appSlugFilter.trim();
    if (cursor) params.cursor = cursor;
    const doLoad = cursor ? setLoadingMore : setLoading;
    doLoad(true);
    setError(null);
    getReports(params)
      .then(({ reports: list, nextCursor: next }) => {
        if (append) {
          setReports((prev) => [...prev, ...list]);
        } else {
          setReports(list);
        }
        setNextCursor(next);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load reports");
        if (!append) setReports([]);
      })
      .finally(() => {
        doLoad(false);
      });
  }

  useEffect(() => {
    loadReports();
  }, [statusFilter, appSlugFilter]);

  function handleApplyAppSlug() {
    setAppSlugFilter(appSlugInput.trim());
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Reports</h1>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="status-filter" className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="app-slug" className="text-xs">App slug</Label>
            <div className="flex gap-1">
              <Input
                id="app-slug"
                placeholder="Filter by app slug"
                value={appSlugInput}
                onChange={(e) => setAppSlugInput(e.target.value)}
                className="w-48"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleApplyAppSlug}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading && <Loader />}
      {!loading && !error && reports.length === 0 && (
        <p className="text-muted-foreground">No reports found.</p>
      )}
      {!loading && reports.length > 0 && (
        <ul className="space-y-2">
          {reports.map((report) => (
            <li key={report.id}>
              <Link href={`/review/reports/${report.id}`}>
                <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <CardTitle className="text-base font-medium">
                        {report.appSlug || report.appId}
                        <span className="text-muted-foreground font-normal ml-2 text-sm">
                          Report #{report.id.slice(0, 8)}
                        </span>
                      </CardTitle>
                      <Badge variant={report.status === "pending" ? "default" : "secondary"}>
                        {report.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    {report.reason && (
                      <p className="line-clamp-1">{report.reason}</p>
                    )}
                    <p className="mt-1 text-xs">
                      {formatTimestamp(report.createdAt)}
                      {report.resolvedAt != null && (
                        <> · Resolved {formatTimestamp(report.resolvedAt)}</>
                      )}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && nextCursor && reports.length > 0 && (
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => loadReports(nextCursor, true)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
