"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareButtonProps = {
  title: string;
  url?: string;
};

export function ShareButton({ title, url: urlProp }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = urlProp ?? (typeof window !== "undefined" ? window.location.href : "");
    const shareData = { title, url };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        if ((err as Error).name !== "AbortError") copyFallback(url);
      }
    } else {
      copyFallback(url);
    }
  }

  function copyFallback(url: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleShare}
      aria-label={copied ? "Link copied" : "Share app"}
    >
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
