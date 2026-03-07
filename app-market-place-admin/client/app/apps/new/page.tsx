"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCategories, createApp } from "@/lib/api/admin-client";
import type { Category, CreateAppInput, UpdateAppInput } from "@/lib/models";
import { AppForm } from "@/components/app-form";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function NewAppPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const resolveBeforeSubmitRef = useRef<(accepted: boolean) => void>(() => {});
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load categories");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onBeforeSubmit(_values: CreateAppInput | UpdateAppInput) {
    return new Promise<boolean>((resolve) => {
      resolveBeforeSubmitRef.current = (accepted: boolean) => {
        setTermsDialogOpen(false);
        resolve(accepted);
      };
      setTermsDialogOpen(true);
    });
  }

  async function handleSubmit(values: CreateAppInput | UpdateAppInput) {
    await createApp(values as CreateAppInput);
    toast.success("App created");
    router.replace("/apps");
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={32} />
          </div>
        ) : (
          <>
            <AlertDialog
              open={termsDialogOpen}
              onOpenChange={(open) => {
                setTermsDialogOpen(open);
                if (!open) resolveBeforeSubmitRef.current(false);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terms and conditions</AlertDialogTitle>
                  <AlertDialogDescription>
                    By submitting you confirm that your app complies with our{" "}
                    <a href="/terms" className="underline" target="_blank" rel="noopener noreferrer">
                      Terms of Use
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="underline" target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </a>
                    .
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resolveBeforeSubmitRef.current(true)}>
                    I accept and continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AppForm
              mode="create"
              initialValues={null}
              categories={categories}
              onSubmit={handleSubmit}
              slugReadOnly={false}
              onBeforeSubmit={onBeforeSubmit}
            />
          </>
        )}
      </main>
    </div>
  );
}
