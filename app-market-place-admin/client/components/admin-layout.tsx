"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDeveloper } from "@/lib/api/admin-client";

const navMain = [
  { href: "/apps", label: "My Apps" },
  { href: "/apps/new", label: "Add App" },
] as const;

const navLegal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [developerVerified, setDeveloperVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    getDeveloper()
      .then((d) => setDeveloperVerified(d.verified))
      .catch(() => setDeveloperVerified(null));
  }, [pathname]);

  const isAuthPage =
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname === "/signup";
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
          </Button>
          <Link
            href="/apps"
            className="rounded-md px-2 py-1.5 text-base font-semibold tracking-tight hover:bg-muted"
          >
            AndroHub
          </Link>
          <nav
            aria-label="Main"
            className="hidden items-center gap-0.5 lg:flex lg:gap-1"
          >
            {navMain.map(({ href, label }) => (
              <NavLink
                key={href}
                href={href}
                active={pathname === href || (href === "/apps" && pathname.startsWith("/apps") && pathname !== "/apps/new")}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {developerVerified === false && (
            <Button variant="outline" size="sm" asChild className="hidden gap-1.5 lg:flex">
              <Link href="/auth/verify-github">
                <Github className="size-4" />
                Verify with GitHub
              </Link>
            </Button>
          )}
          <nav
            aria-label="Legal"
            className="hidden items-center gap-0.5 lg:flex lg:gap-1"
          >
            {navLegal.map(({ href, label }) => (
              <NavLink
                key={href}
                href={href}
                active={pathname === href}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="fixed left-0 right-0 top-14 z-30 border-b border-border bg-background shadow-lg">
            <nav className="flex flex-col gap-0.5 p-3" aria-label="Mobile menu">
              {navMain.map(({ href, label }) => (
                <NavLink
                  key={href}
                  href={href}
                  active={pathname === href || (href === "/apps" && pathname.startsWith("/apps") && pathname !== "/apps/new")}
                >
                  {label}
                </NavLink>
              ))}
              {developerVerified === false && (
                <Link
                  href="/auth/verify-github"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Github className="size-4" />
                  Verify with GitHub
                </Link>
              )}
              <div className="my-2 border-t border-border" />
              {navLegal.map(({ href, label }) => (
                <NavLink
                  key={href}
                  href={href}
                  active={pathname === href}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
