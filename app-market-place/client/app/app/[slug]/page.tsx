"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAppDetailBySlug } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PLATFORM_LABEL_LONG, type Platform } from "@/lib/constants";
import type { App as AppCardType, AppDetail } from "@/lib/models";
import { AppCard } from "@/components/app-card";
import { AppQRCode } from "@/components/app-qr-code";
import { ReportAppButton } from "@/components/report-app-button";
import { SectionHeading } from "@/components/section-heading";
import { ShareButton } from "@/components/share-button";
import { SiteHeader } from "@/components/site-header";

function getPlatformLabel(platform: Platform | string): string {
  return PLATFORM_LABEL_LONG[platform as Platform] ?? platform;
}

export default function AppDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [app, setApp] = useState<AppDetail | null | undefined>(undefined);
  const [downloadGatewayUrl, setDownloadGatewayUrl] = useState("");

  useEffect(() => {
    if (!slug) {
      queueMicrotask(() => setApp(null));
      return;
    }
    let cancelled = false;
    getAppDetailBySlug(slug)
      .then((data) => {
        if (!cancelled) setApp(data);
      })
      .catch(() => {
        if (!cancelled) setApp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window !== "undefined" && slug)
        setDownloadGatewayUrl(`${window.location.origin}/api/apps/${slug}/download`);
      else
        setDownloadGatewayUrl("");
    });
  }, [slug]);

  if (!slug) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
          <p className="text-muted-foreground">Invalid app.</p>
        </main>
      </div>
    );
  }

  if (app === undefined) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="mt-6 h-24 w-24 rounded-2xl bg-muted animate-pulse" />
        </main>
      </div>
    );
  }

  if (app === null) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
          <p className="text-muted-foreground">App not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">Back to AndroHub</Link>
          </Button>
        </main>
      </div>
    );
  }

  const category = app.category ?? null;
  const moreFromDeveloper = app.moreFromDeveloper ?? [];
  const downloadGatewayPath = `/api/apps/${slug}/download`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            {category && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/?category=${category.id}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden>/</li>
            <li className="font-medium text-foreground truncate">{app.name}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <section className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                <Image
                  src={app.icon}
                  alt={`${app.name} icon`}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
                <p className="text-muted-foreground">{app.developer}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {app.rating != null && (
                    <span
                      className="text-sm font-medium"
                      aria-label={`Rating: ${app.rating} out of 5`}
                    >
                      ★ {app.rating.toFixed(1)}
                    </span>
                  )}
                  {category && (
                    <Badge variant="outline" className="font-normal">
                      {category.name}
                    </Badge>
                  )}
                  <Badge variant="secondary">{getPlatformLabel(app.platform)}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {app.downloadCount} downloads
                  </span>
                  {app.size && <span className="text-sm text-muted-foreground">{app.size}</span>}
                  {app.version && (
                    <span className="text-sm text-muted-foreground">
                      Version {app.version}
                      {app.versionCode != null ? ` (${app.versionCode})` : ""}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={() => {
                      window.open(downloadGatewayPath, "_blank", "noopener,noreferrer");
                      const next = String(
                        (parseInt(app.downloadCount || "0", 10) || 0) + 1
                      );
                      setApp((prev) =>
                        prev ? { ...prev, downloadCount: next } : prev
                      );
                    }}
                  >
                    Download
                  </Button>
                  <ShareButton title={app.name} />
                  <ReportAppButton appId={app.id} slug={slug} />
                </div>
              </div>
            </section>

            <section>
              <SectionHeading>About</SectionHeading>
              <p className="text-muted-foreground leading-relaxed">{app.description}</p>
            </section>

            {app.videoUrl && (
              <section>
                <SectionHeading>Video</SectionHeading>
                <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                  <iframe
                    src={app.videoUrl}
                    title={`${app.name} demo video`}
                    className="size-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {app.screenshots.length > 0 && (
              <section>
                <SectionHeading>Screenshots</SectionHeading>
                <div
                  className="scroll-horizontal flex gap-4 pb-2 pt-1"
                  role="region"
                  aria-label="App screenshots - scroll horizontally to view more"
                >
                  {app.screenshots.map((src, i) => (
                    <div
                      key={i}
                      className="relative h-64 w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      <Image
                        src={src}
                        alt={`${app.name} screenshot ${i + 1}`}
                        width={160}
                        height={256}
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {moreFromDeveloper.length > 0 && (
              <section>
                <SectionHeading>More from {app.developer}</SectionHeading>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {moreFromDeveloper.slice(0, 2).map((a) => (
                    <li key={a.id}>
                      <AppCard app={a as AppCardType} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <Card className="border-border">
              <CardContent className="pt-6">
                <p className="mb-3 text-sm font-medium">Scan to download</p>
                <AppQRCode value={downloadGatewayUrl ?? downloadGatewayPath} size={180} />
                <p className="mt-3 text-xs text-muted-foreground">
                  Point your phone camera at the QR code to get the app.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
