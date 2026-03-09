import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Github, Settings, Mail } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthSettingsDialogProps {
  developerVerified: boolean | null;
  className?: string;
  isMobile?: boolean;
}

export function AuthSettingsDialog({ developerVerified, className, isMobile }: AuthSettingsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isMobile ? (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
              className
            )}
          >
            <Settings className="size-4" />
            Authentication Settings
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5", className)}
          >
            <Settings className="size-4" />
            Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Authentication Settings</DialogTitle>
          <DialogDescription>
            Connect external accounts to enable marketplace features.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Github className="size-5" />
              GitHub
            </div>
            <p className="text-sm text-muted-foreground">
              Required to list applications on the marketplace.
            </p>
            {developerVerified === false ? (
              <Button asChild className="mt-2 w-full sm:w-auto self-start">
                <Link href="/auth/verify-github" onClick={() => setOpen(false)}>
                  Verify with GitHub
                </Link>
              </Button>
            ) : developerVerified === true ? (
              <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                ✓ Verified
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Mail className="size-5" />
              Gmail API
            </div>
            <p className="text-sm text-muted-foreground">
              Required to send system emails (approvals, rejections).
            </p>
            <Button variant="secondary" className="mt-2 w-full sm:w-auto self-start" asChild>
              <Link href="/api/auth/google" onClick={() => setOpen(false)}>
                Connect Gmail API
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
