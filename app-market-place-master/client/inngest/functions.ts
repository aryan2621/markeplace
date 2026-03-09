import { inngest } from "@/inngest/client";
import { getDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { writeAuditLog } from "@/lib/audit-log";
import { REPORT_SUSPEND_THRESHOLD } from "@/inngest/steps/constants";
import {
  loadAppStep,
  validateDownloadUrlStep,
  rejectMissingApkStep,
  callExtractionServiceStep,
  writePermissionsStep,
  calculateRiskStep,
  persistRiskLogStep,
  rejectAppStep,
  setInReviewStep,
  sendSuccessEmailStep,
  auditInReviewStep,
} from "@/inngest/steps/app-submission";
import type { LoadAppResult, RiskResult } from "@/inngest/steps/app-submission";
import { EXTRACTION_SERVICE_URL } from "@/inngest/steps/constants";

export const checkReportThresholds = inngest.createFunction(
  {
    id: "check-report-thresholds",
    name: "Suspend apps that exceed report threshold",
    retries: 1,
  },
  { cron: "0 0,12 * * *" },
  async () => {
    const db = getDb();
    const reportsSnap = await db.collection(COLLECTIONS.appReports).get();
    const countBySlug: Record<string, number> = {};
    reportsSnap.docs.forEach((d) => {
      const data = d.data();
      const slug = (data.appSlug || data.appId) as string;
      if (slug) countBySlug[slug] = (countBySlug[slug] || 0) + 1;
    });
    const toSuspend = Object.entries(countBySlug).filter(([, c]) => c >= REPORT_SUSPEND_THRESHOLD);
    for (const [appSlug] of toSuspend) {
      const appRef = db.collection(COLLECTIONS.apps).doc(appSlug);
      const appSnap = await appRef.get();
      if (appSnap.exists && (appSnap.data()?.status as string) === "published") {
        await appRef.update({ status: "suspended" });
        await writeAuditLog({
          userId: "system",
          action: "app.suspended.reports",
          entityType: "app",
          entityId: appSlug,
          oldValue: "published",
          newValue: "suspended",
        });
      }
    }
    return { checked: Object.keys(countBySlug).length, suspended: toSuspend.length };
  }
);

export const appSubmitted = inngest.createFunction(
  {
    id: "app-submitted",
    name: "Process app submission",
    retries: 2,
  },
  { event: "app/submitted" },
  async ({ event, step, logger }) => {
    const { slug } = event.data as { appId: string; slug: string };
    if (!slug) throw new Error("Missing slug in event");

    const stepLogger = {
      info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
      error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
    };

    logger.info("App submission workflow started", { slug, eventName: event.name });

    const db = getDb();
    const appRef = db.collection(COLLECTIONS.apps).doc(slug);

    const appSnap = (await step.run("load-app", () =>
      loadAppStep(slug, appRef, stepLogger)
    )) as LoadAppResult;

    if (appSnap.skip) return { skipped: true, status: appSnap.status };

    const app = appSnap.app;
    const downloadUrl = app.downloadUrl as string | undefined;
    const developerEmail = (app.developerEmail as string) || "";

    const validation = await step.run("validate-download-url", () =>
      validateDownloadUrlStep(slug, downloadUrl, stepLogger)
    );

    if (!validation.valid) {
      await step.run("reject-missing-apk", () =>
        rejectMissingApkStep({
          slug,
          db,
          appRef,
          app,
          developerEmail,
          reason: validation.reason ?? "Missing download URL (APK).",
          logger: stepLogger,
        })
      );
      return { rejected: true, reason: "missing_apk" };
    }

    let packageName: string | null = null;
    let permissions: { name: string; protectionLevel: string }[] = [];

    if (EXTRACTION_SERVICE_URL) {
      const extraction = await step.run("call-extraction-service", () =>
        callExtractionServiceStep(slug, downloadUrl!, stepLogger)
      );
      packageName = extraction.packageName ?? null;
      permissions = (extraction.permissions ?? []).map((p) => ({
        name: p.name,
        protectionLevel: p.protectionLevel ?? "unknown",
      }));
    } else {
      logger.info("No extraction service configured; skipping permission extraction", { slug });
    }

    await step.run("write-permissions", () =>
      writePermissionsStep({
        slug,
        db,
        appRef,
        permissions,
        packageName,
        logger: stepLogger,
      })
    );

    const riskResult = (await step.run("calculate-risk", () =>
      calculateRiskStep({
        slug,
        app,
        permissions,
        db,
        logger: stepLogger,
      })
    )) as unknown as RiskResult;

    const riskScore = riskResult.riskScore ?? 0;

    await step.run("persist-risk-log", () =>
      persistRiskLogStep({
        slug,
        db,
        riskScore,
        factors: riskResult.factors,
        logger: stepLogger,
      })
    );

    const shouldReject = riskScore > 80 || riskResult.keywordHits.length > 0;

    if (shouldReject) {
      await step.run("reject-app", () =>
        rejectAppStep({
          slug,
          appRef,
          app,
          developerEmail,
          riskScore,
          keywordHits: riskResult.keywordHits,
          logger: stepLogger,
        })
      );
      return { rejected: true, riskScore, keywordHits: riskResult.keywordHits };
    }

    await step.run("set-in-review", () =>
      setInReviewStep(slug, appRef, riskScore, stepLogger)
    );

    await step.run("send-success-email", () =>
      sendSuccessEmailStep({
        slug,
        app,
        developerEmail,
        logger: stepLogger,
      })
    );

    await step.run("audit-in-review", () =>
      auditInReviewStep(slug, stepLogger)
    );

    logger.info("App submission workflow completed successfully", { slug, riskScore });
    return { ok: true, riskScore, inReview: true };
  }
);
