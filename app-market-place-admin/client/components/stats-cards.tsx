"use client";

import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  totalApps: number;
  publishedCount: number;
  draftCount: number;
  categoryCount: number;
}

export function StatsCards({ totalApps, publishedCount, draftCount, categoryCount }: StatsCardsProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="transition-shadow duration-200">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Total apps</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{totalApps}</p>
        </CardContent>
      </Card>
      <Card className="transition-shadow duration-200">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Published</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
            {publishedCount}
          </p>
        </CardContent>
      </Card>
      <Card className="transition-shadow duration-200">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Drafts</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {draftCount}
          </p>
        </CardContent>
      </Card>
      <Card className="transition-shadow duration-200">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-muted-foreground">Categories in use</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{categoryCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
