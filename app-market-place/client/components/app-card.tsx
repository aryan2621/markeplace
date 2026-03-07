import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Platform, PLATFORM_LABEL_SHORT } from "@/lib/constants";
import type { App } from "@/lib/models";

function getPlatformLabel(platform: Platform): string {
  return PLATFORM_LABEL_SHORT[platform] ?? platform;
}

function StarRating({ rating, className }: { rating: number; className?: string }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className={`inline-flex items-center gap-px text-amber-500 ${className ?? ""}`} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="inline-block size-3.5">
          {i <= full ? (
            "★"
          ) : i === full + 1 && half ? (
            <span className="opacity-80">★</span>
          ) : (
            <span className="text-muted-foreground/50">★</span>
          )}
        </span>
      ))}
    </span>
  );
}

export function AppCard({ app }: { app: App }) {
  return (
    <Link
      href={`/app/${app.slug}`}
      className="block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full transition-colors transition-shadow duration-200 hover:bg-muted/50 hover:shadow-md">
        <CardHeader className="flex flex-row items-start gap-4 pb-2">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            <Image
              src={app.icon}
              alt={`${app.name} icon`}
              width={56}
              height={56}
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-semibold truncate">{app.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{app.developer}</p>
            <div className="flex flex-wrap items-center gap-2">
              {app.rating != null && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  aria-label={`Rating: ${app.rating.toFixed(1)} out of 5`}
                >
                  <StarRating rating={app.rating} />
                  <span>{app.rating.toFixed(1)}</span>
                </span>
              )}
              <Badge variant="secondary" className="text-xs">
                {getPlatformLabel(app.platform)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">{app.shortDescription}</p>
          <p className="mt-2 text-xs text-muted-foreground">{app.downloadCount} downloads</p>
        </CardContent>
      </Card>
    </Link>
  );
}
