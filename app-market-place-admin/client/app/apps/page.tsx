"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getApps, getCategories } from "@/lib/api/admin-client";
import { ErrorMessages } from "@/lib/constants";
import type { App, Category } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PLATFORM_LABEL_SHORT } from "@/lib/constants";
import type { Platform } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { StatsCards } from "@/components/stats-cards";

function getPlatformLabel(platform: Platform): string {
  return PLATFORM_LABEL_SHORT[platform] ?? platform;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  in_review: "In review",
  rejected: "Rejected",
  published: "Published",
  suspended: "Suspended",
};

function getStatusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "published") return "default";
  if (status === "rejected" || status === "suspended") return "secondary";
  return "outline";
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2);
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function AppIconThumb({ icon, name }: { icon: string | null | undefined; name: string }) {
  const [imageError, setImageError] = useState(false);
  const showInitials = !icon || imageError;

  if (showInitials) {
    return (
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
        aria-hidden
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
      <img
        src={icon}
        alt=""
        className="size-10 object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

function EmptyStateIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function AppsListPageContent() {
  const searchParams = useSearchParams();
  const [apps, setApps] = useState<App[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "github") toast.success("GitHub verified. You can submit apps for review.");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getApps(), getCategories()])
      .then(([appsList, categoriesList]) => {
        if (cancelled) return;
        setApps(appsList);
        setCategories(categoriesList);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : ErrorMessages.FAILED_TO_LOAD;
          setError(msg);
          toast.error(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        !search.trim() ||
        app.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (app.developer?.toLowerCase().includes(search.trim().toLowerCase()) ?? false);
      const matchesCategory = !categoryId || app.categoryId === categoryId;
      const matchesStatus =
        !statusFilter || (app.status ?? "draft") === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [apps, search, categoryId, statusFilter]);

  const stats = useMemo(() => {
    const published = apps.filter((a) => a.status === "published").length;
    const draft = apps.filter((a) => (a.status ?? "draft") === "draft").length;
    const categoriesInUse = new Set(apps.map((a) => a.categoryId).filter(Boolean)).size;
    return { total: apps.length, published, draft, categoriesInUse };
  }, [apps]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">My Apps</h1>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {!loading && (
          <StatsCards
            totalApps={stats.total}
            publishedCount={stats.published}
            draftCount={stats.draft}
            categoryCount={stats.categoriesInUse}
          />
        )}
        {!loading && apps.length > 0 && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="app-search" className="sr-only">
                Search apps
              </Label>
              <Input
                id="app-search"
                type="search"
                placeholder="Search by name or developer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm transition-colors duration-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-category" className="text-sm text-muted-foreground">
                  Category
                </Label>
                <Select value={categoryId || "__all__"} onValueChange={(v) => setCategoryId(v === "__all__" ? "" : v)}>
                  <SelectTrigger id="filter-category" className="w-[160px] transition-colors duration-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-status" className="text-sm text-muted-foreground">
                  Status
                </Label>
                <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger id="filter-status" className="w-[120px] transition-colors duration-200">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Pending review</SelectItem>
                    <SelectItem value="in_review">In review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(search || categoryId || statusFilter) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setCategoryId("");
                    setStatusFilter("");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
        {loading ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-5 w-14 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <EmptyStateIcon className="mb-4 size-16 text-muted-foreground" />
            <p className="mb-1 text-lg font-medium text-foreground">No apps yet</p>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Add your first app to get started. You can publish it to AndroHub when it&apos;s ready.
            </p>
            <Button asChild>
              <Link href="/apps/new">Add your first app</Link>
            </Button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
            <p className="text-muted-foreground">No apps match your filters.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearch("");
                setCategoryId("");
                setStatusFilter("");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApps.map((app) => (
              <li key={app.id}>
                <Card className="h-full transition-colors transition-shadow duration-200 hover:bg-muted/50 hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <AppIconThumb icon={app.icon} name={app.name} />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{app.name}</h3>
                          <p className="text-muted-foreground text-sm truncate">
                            {app.developer}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge
                              variant={getStatusVariant(app.status ?? "draft")}
                              className="text-xs"
                            >
                              {STATUS_LABEL[app.status ?? "draft"] ?? app.status ?? "Draft"}
                            </Badge>
                            {app.rating != null && (
                              <span className="text-xs font-medium">
                                ★ {app.rating.toFixed(1)}
                              </span>
                            )}
                            {categoryMap.get(app.categoryId) && (
                              <Badge variant="secondary" className="text-xs">
                                {categoryMap.get(app.categoryId)}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getPlatformLabel(app.platform)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="transition-colors duration-200">
                        <Link href={`/apps/${app.slug}/edit`}>Edit</Link>
                      </Button>
                    </div>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                      {app.shortDescription}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function AppsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <main className="mx-auto max-w-6xl px-4 py-8">
            <h1 className="mb-4 text-2xl font-bold tracking-tight">My Apps</h1>
            <div className="flex justify-center py-12">
              <Spinner size={32} />
            </div>
          </main>
        </div>
      }
    >
      <AppsListPageContent />
    </Suspense>
  );
}
