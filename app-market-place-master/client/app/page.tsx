import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          AndroHub Master
        </h1>
        <p className="text-muted-foreground text-center max-w-md">
          Review and publish apps for the marketplace.
        </p>
        <Button size="lg" asChild>
          <Link href="/review">Open review queue</Link>
        </Button>
      </div>
    </div>
  );
}
