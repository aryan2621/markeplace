import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AppCardSkeleton() {
  return (
    <Card className="h-full border-border">
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <div className="size-14 shrink-0 rounded-xl bg-muted/60" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted/60" />
          <div className="h-3 w-1/2 rounded bg-muted/60" />
          <div className="h-3 w-1/4 rounded bg-muted/60" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted/60" />
          <div className="h-3 w-4/5 rounded bg-muted/60" />
        </div>
        <div className="mt-2 h-3 w-1/3 rounded bg-muted/60" />
      </CardContent>
    </Card>
  );
}
