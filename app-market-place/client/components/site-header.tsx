import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-muted/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          AndroHub
        </Link>
        <nav className="flex items-center gap-6" aria-label="Page navigation">
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Use
          </Link>
        </nav>
      </div>
    </header>
  );
}
