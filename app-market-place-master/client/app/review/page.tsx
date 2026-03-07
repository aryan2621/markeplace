"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReviewApps } from "@/lib/review-client";
import type { ReviewApp } from "@/lib/review-client";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All in queue" },
  { value: "pending_review", label: "Pending review" },
  { value: "in_review", label: "In review" },
];

export default function ReviewQueuePage() {
  const [apps, setApps] = useState<ReviewApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = statusFilter === "all" ? undefined : statusFilter;
    getReviewApps(query)
      .then((list) => {
        if (!cancelled) setApps(list);
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
  }, [statusFilter]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Review queue</h1>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loading && <Loader />}
          {!loading && !error && apps.length === 0 && (
            <p className="text-muted-foreground">No apps in review.</p>
          )}
          {!loading && apps.length > 0 && (
            <ul className="space-y-2">
              {apps.map((app) => (
                <li key={app.slug}>
                  <Link href={`/review/${app.slug}`}>
                    <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-base font-medium">
                            {app.name}
                            <span className="text-muted-foreground font-normal ml-2 text-sm">
                              ({app.slug})
                            </span>
                          </CardTitle>
                          <Badge variant="secondary">{app.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{app.developer}</p>
                        {app.riskScore != null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Risk score: {app.riskScore}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="w-44 shrink-0" role="group" aria-label="Filter by status">
          <div className="flex flex-col gap-2 sticky top-4">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
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
        </aside>
      </div>
    </div>
  );
}
