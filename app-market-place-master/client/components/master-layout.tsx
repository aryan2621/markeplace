"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navMain = [
  { href: "/", label: "Home" },
  { href: "/review", label: "Review queue" },
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

export function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isAuthPage =
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up");
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
            href="/"
            className="rounded-md px-2 py-1.5 text-base font-semibold tracking-tight hover:bg-muted"
          >
            AndroHub Master
          </Link>
          <nav
            aria-label="Main"
            className="hidden items-center gap-0.5 lg:flex lg:gap-1"
          >
            {navMain.map(({ href, label }) => (
              <NavLink
                key={href}
                href={href}
                active={
                  pathname === href ||
                  (href === "/review" && pathname.startsWith("/review"))
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden lg:flex gap-1.5" asChild>
            <Link href="/api/auth/google">
              <Mail className="size-4" />
              Connect Gmail API
            </Link>
          </Button>
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
                  active={
                    pathname === href ||
                    (href === "/review" && pathname.startsWith("/review"))
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="my-2 border-t border-border" />
              <Link 
                href="/api/auth/google" 
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Mail className="size-4" />
                Connect Gmail API
              </Link>
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
