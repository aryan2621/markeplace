"use client";

import { useRef, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PLATFORM_VALUES, Platform } from "@/lib/constants";
import { uploadFile } from "@/lib/api/admin-client";
import type { Category, CreateAppInput, UpdateAppInput } from "@/lib/models";
import { Spinner } from "@/components/ui/spinner";

type AppFormValues = {
  name: string;
  slug: string;
  developer: string;
  developerEmail: string;
  shortDescription: string;
  description: string;
  icon: string;
  screenshots: string[];
  videoUrl: string;
  downloadCount: string;
  platform: Platform;
  categoryId: string;
  rating: string;
  size: string;
  featuredOrder: string;
  downloadUrl: string;
  version: string;
  versionCode: string;
  packageName: string;
  privacyPolicyUrl: string;
  featureGraphic: string;
  apkFile: string;
  collectsPersonalData: string;
  dataTypesCollected: string;
  dataShared: string;
  encryptionUsed: string;
  contentRating: string;
  containsAds: string;
  containsIap: string;
  containsSubscription: string;
  externalPaymentLinks: string;
};

function toFormValues(input: Partial<CreateAppInput> | null): AppFormValues {
  const raw = input as Record<string, unknown> | null;
  return {
    name: input?.name ?? "",
    slug: input?.slug ?? "",
    developer: input?.developer ?? "",
    developerEmail: (input as { developerEmail?: string })?.developerEmail ?? "",
    shortDescription: input?.shortDescription ?? "",
    description: input?.description ?? "",
    icon: input?.icon ?? "",
    screenshots: (() => {
      const s = input?.screenshots;
      return Array.isArray(s) ? s : [];
    })(),
    videoUrl: input?.videoUrl ?? "",
    downloadCount: input?.downloadCount ?? "",
    platform: (input?.platform as Platform) ?? Platform.Android,
    categoryId: input?.categoryId ?? "",
    rating: input?.rating != null ? String(input.rating) : "",
    size: input?.size ?? "",
    featuredOrder: input?.featuredOrder != null ? String(input.featuredOrder) : "",
    downloadUrl: input?.downloadUrl ?? "",
    version: input?.version ?? "",
    versionCode: input?.versionCode != null ? String(input.versionCode) : "",
    packageName: (raw?.packageName as string) ?? "",
    privacyPolicyUrl: (raw?.privacyPolicyUrl as string) ?? "",
    featureGraphic: (raw?.featureGraphic as string) ?? "",
    apkFile: (raw?.apkFile as string) ?? "",
    collectsPersonalData: String(raw?.collectsPersonalData) === "true" ? "true" : "false",
    dataTypesCollected: Array.isArray(raw?.dataTypesCollected) ? (raw?.dataTypesCollected as string[]).join(", ") : (raw?.dataTypesCollected as string) ?? "",
    dataShared: String(raw?.dataShared) === "true" ? "true" : "false",
    encryptionUsed: String(raw?.encryptionUsed) === "true" ? "true" : "false",
    contentRating: (raw?.contentRating as string) ?? "",
    containsAds: String(raw?.containsAds) === "true" ? "true" : "false",
    containsIap: String(raw?.containsIap) === "true" ? "true" : "false",
    containsSubscription: String(raw?.containsSubscription) === "true" ? "true" : "false",
    externalPaymentLinks: String(raw?.externalPaymentLinks) === "true" ? "true" : "false",
  };
}

function formValuesToCreate(values: AppFormValues): CreateAppInput {
  const screenshots = values.screenshots.filter((s) => s.trim() !== "");
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    developer: values.developer.trim(),
    developerEmail: values.developerEmail.trim(),
    shortDescription: values.shortDescription.trim(),
    description: values.description.trim(),
    icon: values.icon.trim(),
    screenshots,
    videoUrl: values.videoUrl.trim() || undefined,
    downloadCount: "0",
    platform: values.platform,
    categoryId: values.categoryId,
    downloadUrl: values.downloadUrl.trim(),
    version: values.version.trim() || undefined,
    versionCode: values.versionCode ? Number(values.versionCode) : undefined,
    packageName: values.packageName.trim() || undefined,
    privacyPolicyUrl: values.privacyPolicyUrl.trim() || undefined,
    featureGraphic: values.featureGraphic.trim() || undefined,
    apkFile: values.apkFile.trim() || undefined,
    contentRating: values.contentRating.trim() || undefined,
    containsAds: values.containsAds === "true",
    containsIap: values.containsIap === "true",
    containsSubscription: values.containsSubscription === "true",
    externalPaymentLinks: values.externalPaymentLinks === "true",
    collectsPersonalData: values.collectsPersonalData === "true",
    dataTypesCollected: values.dataTypesCollected.trim()
      ? values.dataTypesCollected.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    dataShared: values.dataShared === "true",
    encryptionUsed: values.encryptionUsed === "true",
  };
}

function formValuesToUpdate(values: AppFormValues): UpdateAppInput {
  const screenshots = values.screenshots.filter((s) => s.trim() !== "");
  return {
    name: values.name.trim() || undefined,
    developer: values.developer.trim() || undefined,
    developerEmail: values.developerEmail.trim() || undefined,
    shortDescription: values.shortDescription.trim() || undefined,
    description: values.description.trim() || undefined,
    icon: values.icon.trim() || undefined,
    screenshots: screenshots.length ? screenshots : undefined,
    videoUrl: values.videoUrl.trim() || undefined,
    platform: values.platform,
    categoryId: values.categoryId || undefined,
    downloadUrl: values.downloadUrl.trim() || undefined,
    version: values.version.trim() || undefined,
    versionCode: values.versionCode ? Number(values.versionCode) : undefined,
    packageName: values.packageName.trim() || undefined,
    privacyPolicyUrl: values.privacyPolicyUrl.trim() || undefined,
    featureGraphic: values.featureGraphic.trim() || undefined,
    apkFile: values.apkFile.trim() || undefined,
    contentRating: values.contentRating.trim() || undefined,
    containsAds: values.containsAds === "true",
    containsIap: values.containsIap === "true",
    containsSubscription: values.containsSubscription === "true",
    externalPaymentLinks: values.externalPaymentLinks === "true",
    collectsPersonalData: values.collectsPersonalData === "true",
    dataTypesCollected: values.dataTypesCollected.trim()
      ? values.dataTypesCollected.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    dataShared: values.dataShared === "true",
    encryptionUsed: values.encryptionUsed === "true",
  };
}

const DRAFT_STORAGE_KEY = "app-marketplace-admin-draft";

function loadDraft(): AppFormValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return toFormValues(parsed);
  } catch {
    return null;
  }
}

function saveDraftToStorage(values: AppFormValues) {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
  } catch {}
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {}
}

type AppFormProps = {
  mode: "create" | "edit";
  initialValues: Partial<CreateAppInput> | null;
  categories: Category[];
  onSubmit: (values: CreateAppInput | UpdateAppInput) => Promise<void>;
  slugReadOnly?: boolean;
  onBeforeSubmit?: (values: CreateAppInput | UpdateAppInput) => Promise<boolean>;
  onHasChanges?: (hasChanges: boolean) => void;
};

export function AppForm({
  mode,
  initialValues,
  categories,
  onSubmit,
  slugReadOnly = false,
  onBeforeSubmit,
  onHasChanges,
}: AppFormProps) {
  const { user } = useUser();
  const [values, setValues] = useState<AppFormValues>(() =>
    toFormValues(initialValues)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshotsRaw, setScreenshotsRaw] = useState(() => values.screenshots.join("\n"));
  const downloadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "create" && !initialValues) {
      const draft = loadDraft();
      if (draft) {
        setValues(draft);
        setScreenshotsRaw(draft.screenshots.join("\n"));
      }
    }
  }, [mode, initialValues]);

  useEffect(() => {
    if (user && mode === "create") {
      setValues(prev => ({
        ...prev,
        developer: prev.developer || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.fullName || "",
        developerEmail: prev.developerEmail || user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || ""
      }));
    }
  }, [user, mode]);

  useEffect(() => {
    if (onHasChanges) {
      const initialFormValues = toFormValues(initialValues);
      const isDirty = JSON.stringify(values) !== JSON.stringify(initialFormValues);
      onHasChanges(isDirty);
    }
  }, [values, initialValues, onHasChanges]);

  function handleSaveDraft() {
    saveDraftToStorage(values);
    setDraftSaved(true);
    setError(null);
    toast.success("Draft saved");
    setTimeout(() => setDraftSaved(false), 2000);
  }

  async function handleUploadApk(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      update("downloadUrl", url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (downloadInputRef.current) downloadInputRef.current.value = "";
    }
  }

  function update<K extends keyof AppFormValues>(key: K, value: AppFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleScreenshotsChange(raw: string) {
    setScreenshotsRaw(raw);
    const list = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    update("screenshots", list);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    setError(null);
    
    const payload =
      mode === "create" ? formValuesToCreate(values) : formValuesToUpdate(values);
    if (onBeforeSubmit && !(await onBeforeSubmit(payload))) return;
    setSubmitting(true);
    try {
      if (mode === "create") {
        await onSubmit(payload as CreateAppInput);
        clearDraft();
      } else {
        await onSubmit(payload);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const invalid = (key: keyof AppFormValues) =>
    submitAttempted && typeof values[key] === "string" && !String(values[key]).trim();
  const invalidDesc = submitAttempted && !values.description.trim();
  const invalidIcon = submitAttempted && !values.icon.trim();
  const invalidDownloadUrl = submitAttempted && !values.downloadUrl.trim();
  const invalidCategory = submitAttempted && !values.categoryId;
  const iconUrlValid =
    values.icon.trim().startsWith("http://") || values.icon.trim().startsWith("https://");

  const mandatoryFilled =
    mode !== "create" ||
    (Boolean(values.name.trim()) &&
      Boolean(values.slug.trim()) &&
      Boolean(values.shortDescription.trim()) &&
      Boolean(values.description.trim()) &&
      Boolean(values.icon.trim()) &&
      Boolean(values.downloadUrl.trim()) &&
      Boolean(values.categoryId) &&
      Boolean(values.developer.trim()) &&
      Boolean(values.developerEmail.trim()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {mode === "create" ? "New app" : "Edit app"}
        </h2>
        <div className="flex items-center gap-2">
          {mode === "create" && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleSaveDraft}
            >
              {draftSaved ? "Draft saved" : "Save in draft"}
            </Button>
          )}
          <Button
            type="submit"
            form="app-form"
            size="lg"
            disabled={submitting || (mode === "create" && !mandatoryFilled)}
          >
            {submitting ? "Saving…" : mode === "create" ? "Create app" : "Update app"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form id="app-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="text-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground pt-0">Basics</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={values.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                    aria-invalid={invalid("name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={values.slug}
                    onChange={(e) => update("slug", e.target.value)}
                    readOnly={slugReadOnly}
                    required
                    aria-invalid={invalid("slug")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short description</Label>
                <Input
                  id="shortDescription"
                  value={values.shortDescription}
                  onChange={(e) => update("shortDescription", e.target.value)}
                  required
                  aria-invalid={invalid("shortDescription")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={4}
                  className={`border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    invalidDesc ? "border-destructive" : ""
                  }`}
                  value={values.description}
                  onChange={(e) => update("description", e.target.value)}
                  required
                  aria-invalid={invalidDesc}
                />
              </div>

              <Separator className="my-4" />
              <p className="text-sm font-medium text-muted-foreground">Developer</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="developer">Developer</Label>
                  <Input
                    id="developer"
                    value={values.developer}
                    onChange={(e) => update("developer", e.target.value)}
                    disabled={!!user}
                    required
                    aria-invalid={invalid("developer")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="developerEmail">Developer email</Label>
                  <Input
                    id="developerEmail"
                    type="email"
                    value={values.developerEmail}
                    onChange={(e) => update("developerEmail", e.target.value)}
                    disabled={!!user}
                    required={mode === "create"}
                    placeholder="dev@example.com"
                    aria-invalid={invalid("developerEmail")}
                  />
                  {mode === "create" && (
                    <p className="text-muted-foreground text-xs">Required to submit for review</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground pt-0">Media</p>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon URL</Label>
                <div className="flex gap-2 items-center">
                  {iconUrlValid && (
                    <div className="size-8 shrink-0 overflow-hidden rounded bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={values.icon.trim()}
                        alt=""
                        className="size-8 object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>
                  )}
                  <Input
                    id="icon"
                    type="url"
                    value={values.icon}
                    onChange={(e) => update("icon", e.target.value)}
                    required
                    placeholder="https://example.com/icon.png"
                    className="flex-1"
                    aria-invalid={invalidIcon}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="screenshots">Screenshots (one URL per line or comma-separated)</Label>
                <textarea
                  id="screenshots"
                  rows={3}
                  className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={screenshotsRaw}
                  onChange={(e) => handleScreenshotsChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL (optional)</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={values.videoUrl}
                  onChange={(e) => update("videoUrl", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground pt-0">Distribution</p>
              <div className="space-y-2">
                <Label htmlFor="downloadUrl">Download URL</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="downloadUrl"
                    type="url"
                    value={values.downloadUrl}
                    onChange={(e) => update("downloadUrl", e.target.value)}
                    required
                    placeholder="https://example.com/app.apk"
                    className="flex-1 min-w-0"
                    aria-invalid={invalidDownloadUrl}
                  />
                  <input
                    ref={downloadInputRef}
                    type="file"
                    accept=".apk,.aab,application/vnd.android.package-archive"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadApk(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => downloadInputRef.current?.click()}
                    className="shrink-0"
                  >
                    {uploading ? <><Spinner size={16} className="mr-2" /> Uploading…</> : "Upload APK"}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">Paste a URL or upload an APK/AAB file</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="packageName">Package name (optional)</Label>
                  <Input
                    id="packageName"
                    value={values.packageName}
                    onChange={(e) => update("packageName", e.target.value)}
                    placeholder="com.example.app"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="privacyPolicyUrl">Privacy policy URL</Label>
                  <Input
                    id="privacyPolicyUrl"
                    type="url"
                    value={values.privacyPolicyUrl}
                    onChange={(e) => update("privacyPolicyUrl", e.target.value)}
                    placeholder="https://example.com/privacy"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="version">Version (optional)</Label>
                  <Input
                    id="version"
                    value={values.version}
                    onChange={(e) => update("version", e.target.value)}
                    placeholder="1.0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="versionCode">Version code (optional)</Label>
                  <Input
                    id="versionCode"
                    type="number"
                    min={1}
                    value={values.versionCode}
                    onChange={(e) => update("versionCode", e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={values.platform}
                  onValueChange={(v) => update("platform", v as Platform)}
                >
                  <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_VALUES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={values.categoryId}
                  onValueChange={(v) => update("categoryId", v)}
                  required
                >
                  <SelectTrigger id="categoryId" aria-invalid={invalidCategory}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground pt-0">Content rating</p>
              <div className="space-y-2">
                <Label htmlFor="contentRating">Age rating</Label>
                <Select
                  value={values.contentRating}
                  onValueChange={(v) => update("contentRating", v)}
                >
                  <SelectTrigger id="contentRating">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Everyone">Everyone</SelectItem>
                    <SelectItem value="Teen">Teen</SelectItem>
                    <SelectItem value="Mature">Mature 17+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-4" />
              <p className="text-sm font-medium text-muted-foreground">Data safety</p>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.collectsPersonalData === "true"}
                    onChange={(e) => update("collectsPersonalData", e.target.checked ? "true" : "false")}
                  />
                  <span className="text-sm">Collects personal data</span>
                </label>
                <div className="space-y-2">
                  <Label htmlFor="dataTypesCollected">Data types collected (comma-separated, optional)</Label>
                  <Input
                    id="dataTypesCollected"
                    value={values.dataTypesCollected}
                    onChange={(e) => update("dataTypesCollected", e.target.value)}
                    placeholder="Email, name, location"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.dataShared === "true"}
                    onChange={(e) => update("dataShared", e.target.checked ? "true" : "false")}
                  />
                  <span className="text-sm">Data shared with third parties</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.encryptionUsed === "true"}
                    onChange={(e) => update("encryptionUsed", e.target.checked ? "true" : "false")}
                  />
                  <span className="text-sm">Data encrypted in transit</span>
                </label>
              </div>

              <Separator className="my-4" />
              <p className="text-sm font-medium text-muted-foreground">Ads & monetization</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.containsAds === "true"}
                    onChange={(e) => update("containsAds", e.target.checked ? "true" : "false")}
                  />
                  <span className="text-sm">Contains ads</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.containsIap === "true"}
                    onChange={(e) => update("containsIap", e.target.checked ? "true" : "false")}
                  />
                  <span className="text-sm">In-app purchases</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.containsSubscription === "true"}
                    onChange={(e) => update("containsSubscription", e.target.checked ? "true" : "false")}
                  />
                  <span className="text-sm">Subscription</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.externalPaymentLinks === "true"}
                    onChange={(e) => update("externalPaymentLinks", e.target.checked ? "true" : "false")}
                  />
                  <span className="text-sm">External payment links</span>
                </label>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
