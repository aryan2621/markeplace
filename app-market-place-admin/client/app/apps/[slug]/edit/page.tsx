"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAppBySlug, getCategories, getDeveloper, submitForReview, updateApp } from "@/lib/api/admin-client";
import type { App, Category, CreateAppInput, UpdateAppInput } from "@/lib/models";
import { AppForm } from "@/components/app-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function EditAppPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [app, setApp] = useState<App | null | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [developerVerified, setDeveloperVerified] = useState<boolean | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!slug) {
      setApp(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getAppBySlug(slug), getCategories(), getDeveloper()])
      .then(([appData, categoriesList, dev]) => {
        if (cancelled) return;
        setApp(appData);
        setCategories(categoriesList);
        setDeveloperVerified(dev.verified);
      })
      .catch(() => {
        if (!cancelled) {
          setApp(null);
          toast.error("Failed to load app");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSubmit(values: CreateAppInput | UpdateAppInput) {
    const input = values as UpdateAppInput;
    const payload = {
      name: input.name ?? undefined,
      developer: input.developer ?? undefined,
      developerEmail: input.developerEmail ?? undefined,
      shortDescription: input.shortDescription ?? undefined,
      description: input.description ?? undefined,
      icon: input.icon ?? undefined,
      screenshots: input.screenshots ?? undefined,
      videoUrl: input.videoUrl ?? undefined,
      downloadCount: input.downloadCount ?? undefined,
      platform: input.platform ?? undefined,
      categoryId: input.categoryId ?? undefined,
      rating: input.rating ?? undefined,
      size: input.size ?? undefined,
      featuredOrder: (input as UpdateAppInput & { featuredOrder?: number }).featuredOrder ?? undefined,
      downloadS3Key: input.downloadS3Key ?? undefined,
      version: input.version ?? undefined,
      versionCode: input.versionCode ?? undefined,
      packageName: input.packageName ?? undefined,
      privacyPolicyUrl: input.privacyPolicyUrl ?? undefined,
      featureGraphic: input.featureGraphic ?? undefined,
      apkFile: input.apkFile ?? undefined,
      containsAds: input.containsAds ?? undefined,
      containsIap: input.containsIap ?? undefined,
      containsSubscription: input.containsSubscription ?? undefined,
      externalPaymentLinks: input.externalPaymentLinks ?? undefined,
      contentRating: input.contentRating ?? undefined,
      collectsPersonalData: input.collectsPersonalData ?? undefined,
      dataTypesCollected: input.dataTypesCollected ?? undefined,
      dataShared: input.dataShared ?? undefined,
      encryptionUsed: input.encryptionUsed ?? undefined,
    };
    await updateApp(slug, payload);
    toast.success("App updated");
    const definedUpdates = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    ) as Partial<App>;
    setApp((prev) => (prev ? { ...prev, ...definedUpdates } : null));
  }

  async function handleSubmitForReview() {
    if (!app) return;
    if (developerVerified !== true) {
      toast.error("Verify your developer account with GitHub before submitting for review.");
      return;
    }
    const status = app.status ?? "draft";
    const canSubmit =
      status === "draft" || status === "rejected" || status === "published";
    if (!canSubmit) {
      toast.error("Only draft, rejected, or published (version update) apps can be submitted for review.");
      return;
    }
    setSubmitting(true);
    try {
      await submitForReview(slug, crypto.randomUUID());
      toast.success("App submitted for review.");
      setApp((prev) =>
        prev ? { ...prev, status: "pending_review", submittedAt: String(Date.now()) } : null
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit for review");
    } finally {
      setSubmitting(false);
    }
  }

  if (!slug) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-destructive">Invalid app.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/apps">Back to My Apps</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={32} />
          </div>
        ) : app === undefined || app === null ? (
          <div>
            <p className="text-muted-foreground">App not found.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/apps">Back to My Apps</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {(app.status === "draft" || app.status === "rejected" || app.status === "published") && !hasChanges && (
                <>
                  <Button
                    type="button"
                    onClick={handleSubmitForReview}
                    disabled={submitting || developerVerified === false}
                  >
                    {submitting ? (
                      <>
                        <Spinner size={16} className="mr-2" />
                        Submitting…
                      </>
                    ) : app.status === "published" ? (
                      "Submit new version for review"
                    ) : (
                      "Submit for review"
                    )}
                  </Button>
                  {developerVerified === false && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Verify with GitHub
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Verify with GitHub</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2 text-left">
                              <p>
                                To submit apps for review on AndroHub, you need to verify your developer identity with GitHub.
                              </p>
                              <p>
                                You will be redirected to sign in with GitHub. Once verified, you can submit this app for review.
                              </p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                          <AlertDialogCancel>Close</AlertDialogCancel>
                          <Button asChild>
                            <a href="/auth/verify-github">Verify</a>
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {developerVerified === true && (
                    <span className="text-muted-foreground text-sm">Verified with GitHub</span>
                  )}
                </>
              )}
              {app.status === "draft" && (
                <span className="text-muted-foreground text-sm">Draft — not visible on AndroHub.</span>
              )}
              {app.status === "pending_review" && (
                <span className="text-muted-foreground text-sm">Pending review.</span>
              )}
              {app.status === "in_review" && (
                <span className="text-muted-foreground text-sm">In review.</span>
              )}
              {app.status === "rejected" && (
                <span className="text-muted-foreground text-sm">
                  Rejected. Update and submit again.
                  {app.rejectionReason && ` ${app.rejectionReason}`}
                </span>
              )}
              {app.status === "published" && (
                <span className="text-muted-foreground text-sm">
                  Published — visible on AndroHub. Bump version/versionCode to submit a new version for review.
                </span>
              )}
            </div>
            <AppForm
              mode="edit"
              initialValues={{
                name: app.name,
                slug: app.slug,
                developer: app.developer,
                developerEmail: app.developerEmail ?? "",
                shortDescription: app.shortDescription,
                description: app.description,
                icon: app.icon,
                screenshots: app.screenshots,
                videoUrl: app.videoUrl ?? undefined,
                downloadCount: app.downloadCount,
                platform: app.platform,
                categoryId: app.categoryId,
                rating: app.rating ?? undefined,
                size: app.size ?? undefined,
                featuredOrder: (app as App & { featuredOrder?: number }).featuredOrder ?? undefined,
                downloadS3Key: app.downloadS3Key ?? undefined,
                version: app.version ?? undefined,
                versionCode: app.versionCode ?? undefined,
                packageName: app.packageName ?? undefined,
                privacyPolicyUrl: app.privacyPolicyUrl ?? undefined,
                featureGraphic: app.featureGraphic ?? undefined,
                apkFile: app.apkFile ?? undefined,
                containsAds: app.containsAds ?? undefined,
                containsIap: app.containsIap ?? undefined,
                containsSubscription: app.containsSubscription ?? undefined,
                externalPaymentLinks: app.externalPaymentLinks ?? undefined,
                contentRating: app.contentRating ?? undefined,
              }}
              categories={categories}
              onSubmit={handleSubmit}
              slugReadOnly={true}
              onHasChanges={setHasChanges}
            />
          </div>
        )}
      </main>
    </div>
  );
}
