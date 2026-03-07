import { MarketplaceContent } from "@/components/marketplace-content";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-8">
        <MarketplaceContent />
      </main>
    </div>
  );
}
