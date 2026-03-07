"use client";

import { useEffect, useMemo, useState } from "react";
import { getCategories, getApps, getFeaturedApps } from "@/lib/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSearch } from "@/components/app-search";
import { AppCard } from "@/components/app-card";
import { CategoryFilter } from "@/components/category-filter";
import { EmptyState } from "@/components/empty-state";
import { LoadingGrid } from "@/components/loading-grid";
import {
  AriaLabel,
  DEFAULT_MARKETPLACE_TAB,
  ErrorMessages,
  MarketplaceTab,
} from "@/lib/constants";
import type { Category, App } from "@/lib/models";
import type { App as AppCardApp } from "@/lib/models";
import { toast } from "sonner";

function filterApps(list: App[], search: string, categoryId: string | null) {
  const q = search.trim().toLowerCase();
  let result = list;
  if (q) {
    result = result.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.developer.toLowerCase().includes(q) ||
        app.shortDescription.toLowerCase().includes(q)
    );
  }
  if (categoryId) {
    result = result.filter((app) => app.categoryId === categoryId);
  }
  return result;
}

export function MarketplaceContent() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [featuredApps, setFeaturedApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    Promise.all([getCategories(), getApps(), getFeaturedApps()])
      .then(([categoriesList, appsList, featuredList]) => {
        if (cancelled) return;
        setCategories(categoriesList);
        setApps(appsList);
        setFeaturedApps(featuredList);
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

  const filteredAll = useMemo(
    () => filterApps(apps, search, categoryId),
    [apps, search, categoryId]
  );
  const filteredFeatured = useMemo(
    () => filterApps(featuredApps, search, categoryId),
    [featuredApps, search, categoryId]
  );
  const filteredByCategory = useMemo(
    () => filterApps(apps, search, categoryId),
    [apps, search, categoryId]
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="h-8 w-48 rounded bg-muted/60" />
            <div className="h-4 w-64 rounded bg-muted/40" />
          </div>
          <div className="h-9 w-full sm:max-w-sm rounded-md bg-muted/60" />
        </header>
        <div className="h-9 w-full sm:w-64 rounded-lg bg-muted/60" />
        <LoadingGrid count={6} />
      </div>
    );
  }

  const emptySecondary = "Try clearing search or choosing a different category.";

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">AndroHub</h1>
          <p className="text-muted-foreground text-sm">
            Discover and download apps for Android.
          </p>
        </div>
        <div className="w-full sm:max-w-sm">
          <AppSearch value={search} onChange={setSearch} />
        </div>
      </header>

      <Tabs defaultValue={DEFAULT_MARKETPLACE_TAB} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value={MarketplaceTab.All}>All</TabsTrigger>
          <TabsTrigger value={MarketplaceTab.Featured}>Featured</TabsTrigger>
          <TabsTrigger value={MarketplaceTab.Categories}>Categories</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <CategoryFilter
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />
        </div>

        <TabsContent value={MarketplaceTab.Featured} className="mt-6 w-full">
          {filteredFeatured.length === 0 ? (
            <EmptyState
              message="No featured apps match your filters."
              secondary={emptySecondary}
            />
          ) : (
            <ul
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label={AriaLabel.FEATURED_APPS}
            >
              {filteredFeatured.map((app) => (
                <li key={app.id}>
                  <AppCard app={app as AppCardApp} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value={MarketplaceTab.All} className="mt-6 w-full">
          {filteredAll.length === 0 ? (
            <EmptyState message="No apps match your filters." secondary={emptySecondary} />
          ) : (
            <ul
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label={AriaLabel.ALL_APPS}
            >
              {filteredAll.map((app) => (
                <li key={app.id}>
                  <AppCard app={app as AppCardApp} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value={MarketplaceTab.Categories} className="mt-6 w-full">
          {filteredByCategory.length === 0 ? (
            <EmptyState message="No apps match your filters." secondary={emptySecondary} />
          ) : (
            <ul
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label={AriaLabel.APPS_BY_CATEGORY}
            >
              {filteredByCategory.map((app) => (
                <li key={app.id}>
                  <AppCard app={app as AppCardApp} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
