# Product Knowledge: Market Place (AndroHub)

This document captures a complete understanding of the marketplace product: what it is, how it works, and how the pieces fit together.

---

## 1. Product Overview

**Market Place** is a multi-service **Android app marketplace** platform. It allows:

- **Developers** to register, verify identity (GitHub), create app listings, upload APKs (via URL), and submit apps for review.
- **Reviewers (Master)** to process a review queue: approve, reject, request changes, and handle appeals and user reports.
- **End users** to browse published apps by category/featured, search, view app details, and download APKs.

The system is split into four deployable units:

| Service | Purpose |
|--------|--------|
| **apk-extraction-service** | Standalone Node/Express service that downloads an APK from a URL and extracts manifest metadata (package name, permissions, SDK versions) using `adbkit-apkreader`. |
| **app-market-place** | Public-facing Next.js app: browse apps, categories, featured, app detail page, report an app, download APK. |
| **app-market-place-admin** | Developer dashboard: auth (Clerk), GitHub verification, CRUD apps, submit for review, submit appeals. |
| **app-market-place-master** | Reviewer dashboard: review queue, approve/reject/request-changes, appeals list/resolve, reports list/resolve, Inngest-driven submission pipeline. |

Shared persistence is **Firebase (Firestore)**. Admin and Master are separate Next.js apps; Admin triggers the Master’s Inngest workflow via an internal HTTP call after submit.

---

## 2. High-Level Flows

### 2.1 App lifecycle (statuses)

- **draft** — Created/editable by developer in Admin. Only status Admin can set directly.
- **pending_review** — Developer clicked “Submit for review”; set by Admin submit API. Inngest workflow runs from here.
- **in_review** — Pipeline passed (APK valid, risk acceptable); waiting for human reviewer in Master.
- **rejected** — Reviewer rejected (with optional strike). Developer can fix and resubmit or appeal.
- **published** — Approved; visible on public marketplace and downloadable.
- **suspended** — Automatically set when unresolved report count for the app reaches threshold (cron in Master).

Transitions:

- **draft/rejected/published → pending_review**: Admin submit (with idempotency, developer verified, version bump rules for published).
- **pending_review → in_review**: Inngest pipeline (download URL valid, extraction ok, risk ≤ 80, no policy keyword hits).
- **pending_review → rejected**: Inngest (missing APK or risk/keywords fail).
- **in_review / pending_review → published**: Master approve.
- **in_review / pending_review → rejected**: Master reject (optional developer strike).
- **in_review / pending_review → draft**: Master request-changes (feedback stored in `reviewNotes`).
- **published → suspended**: Master cron when report count ≥ `REPORT_SUSPEND_THRESHOLD` (default 10).

### 2.2 Submit-for-review flow (Admin → Master → Inngest)

1. Developer in Admin clicks Submit for an app (draft/rejected/published with version bump).
2. **Admin** `POST /api/admin/apps/[slug]/submit`:
   - Clerk auth required.
   - Idempotency key required (header); claim in Firestore `idempotencyKeys`; 24h TTL; replay cached response on duplicate key.
   - Rate limit (admin).
   - Developer must exist in `users` with `developerStatus === "verified"` (GitHub verification).
   - Slug validation; app must exist and `developerId === userId`; status in `["draft", "rejected", "published"]`; if published, `versionCode` must be > `lastPublishedVersionCode`.
   - App updated: `status: "pending_review"`, `submittedAt`.
   - **Admin calls Master** `POST /api/master/inngest-trigger` with `{ slug }`, authenticated by `x-admin-secret` (ADMIN_INTERNAL_SECRET) or Master user.
3. **Master** inngest-trigger route sends Inngest event `app/submitted` with `{ slug }`.
4. **Inngest function `app-submitted`** (Master):
   - **load-app**: Load app doc; if status ≠ `pending_review`, skip and return.
   - **validate-download-url**: Ensure `downloadUrl` is non-empty (no HTTP fetch).
   - If invalid → **reject-missing-apk**: Set app `status: "rejected"`, `rejectionReason`, send rejection email, audit log, return.
   - **call-extraction-service** (if `EXTRACTION_SERVICE_URL` set): POST to extraction service with `apkUrl` (app’s `downloadUrl`), get `packageName`, `permissions`, etc. Permissions and package name stored on app / `appPermissions` (write-permissions step).
   - **calculate-risk**: Risk score from: new developer (+20), no privacy policy (+30), dangerous permissions (+10 each, cap 50), policy blocklist keywords (+25 each, cap 50), very large APK (+10). Keyword blocklist: casino, gambling, hack, crack, cracked, free coins, cheat, pirate, pirated. Any keyword hit → auto-reject.
   - **persist-risk-log**: Write to `riskLogs` collection.
   - If riskScore > 80 or any keyword hit → **reject-app**: Set `status: "rejected"`, rejection reason, email, audit.
   - Else **set-in-review**: Set app `status: "in_review"`, `riskScore`, `lastVerifiedAt`.
   - **send-success-email**: Notify developer that app is in review.
   - **audit-in-review**: Write audit log.

### 2.3 Review actions (Master)

- **Approve** `POST /api/review/apps/[slug]/approve`: App must be `in_review` or `pending_review`. Set `status: "published"`, `publishedAt`, `lastPublishedVersion`, `lastPublishedVersionCode`. Audit + approval email to developer.
- **Reject** `POST /api/review/apps/[slug]/reject`: Body `reason`, optional `addStrike`, `severity` (warning | temp_suspend | permanent). App → `rejected`, `rejectionReason`. If strike: add `developerStrikes` doc, increment user `strikeCount`; if strikeCount ≥ 3 set `developerStatus: "suspended"`. Audit + rejection email.
- **Request changes** `POST /api/review/apps/[slug]/request-changes`: Body `feedback`. Set app `reviewNotes`, `status: "draft"`. Developer can edit and resubmit.

All require Master user (see Auth below).

### 2.4 Appeals

- **Submit appeal** (Admin): `POST /api/admin/appeals` with `appSlug`, `reason`. App must exist and be owned by caller. Creates `appAppeals` doc with `status: "pending"`.
- **Resolve appeal** (Master): `POST /api/review/appeals/[id]/resolve` with `upheld: true|false`. Updates appeal to `upheld` or `rejected`, `resolvedBy`, `resolvedAt`. Audit. (Resolution does not automatically change app status; it’s a record for the developer.)

### 2.5 Reports (user-reported apps)

- **Submit report** (public marketplace): `POST /api/report` with `appId`, `appSlug`, optional `reporterEmail`, `reason`. Creates `appReports` doc `status: "pending"`. Public rate limit applied.
- **List reports** (Master): `GET /api/review/reports` with filters (status, appSlug, cursor, limit). Master-only.
- **Resolve report** (Master): `POST /api/review/reports/[id]/resolve` with `action: "resolved" | "dismissed"`, optional `note`. Updates report status, `resolvedBy`, `resolvedAt`, `resolutionNote`.

**Auto-suspend**: Cron Inngest function `check-report-thresholds` runs twice daily. Counts pending reports per app; if count ≥ `REPORT_SUSPEND_THRESHOLD` (env, default 10), sets app `status: "suspended"` (if currently published). Audit `app.suspended.reports`.

---

## 3. Data Model (Firestore)

- **apps** — Document ID = slug. Fields: slug, name, developer, developerEmail, developerId, shortDescription, description, icon, screenshots, videoUrl, downloadCount, platform, categoryId, rating, size, downloadUrl, version, versionCode, status, rejectionReason, verificationResult, submittedAt, publishedAt, riskScore, lastVerifiedAt, packageName, privacyPolicyUrl, githubUsername, githubId, reviewNotes, featureGraphic, apkFile, featuredOrder, containsAds, containsIap, containsSubscription, externalPaymentLinks, contentRating, lastPublishedVersion, lastPublishedVersionCode, etc.
- **categories** — Referenced by id; in code, categories are currently from constant `DEFAULT_CATEGORIES` (productivity, social, games, tools, education, entertainment, health-fitness, business, utilities, communication, lifestyle, finance) rather than Firestore in the public/admin category APIs.
- **users** — Document ID = Clerk userId. developerStatus (pending_verification | verified | suspended), strikeCount, githubId, githubUsername, trustScore (optional).
- **appDataSafety** — By app (slug). collectsPersonalData, dataTypesCollected, dataShared, encryptionUsed, privacyPolicyUrl.
- **appPermissions** — Stores extracted permissions (written by Inngest write-permissions step).
- **appReports** — appId, appSlug, reporterEmail, reason, status (pending | resolved | dismissed), createdAt, resolvedAt, resolvedBy, resolutionNote.
- **appAppeals** — appSlug, developerId, reason, status (pending | upheld | rejected), createdAt, resolvedBy, resolvedAt.
- **riskLogs** — Risk run per submission (slug, riskScore, factors, etc.).
- **auditLogs** — userId, action, entityType, entityId, oldValue, newValue, timestamp.
- **developerStrikes** — developerId, appId, reason, severity, createdAt.
- **idempotencyKeys** — (Admin) Document ID = hash(userId + key). pending, responseStatus, responseBody, createdAt. Used only for submit endpoint.

Collections are centralized in `COLLECTIONS` in each app’s `firestore-collections.ts` (admin has idempotencyKeys; master has appReports; both share apps, categories, users, appAppeals, etc.).

---

## 4. Authentication & Authorization

- **Clerk** is used in Admin and Master for user identity (no Firebase Auth for end users in these apps).
- **Admin (developer)**:
  - Any signed-in user can access Admin; app list and app CRUD are scoped by `developerId === userId`.
  - To **submit for review**, user must have `users/{userId}.developerStatus === "verified"`. Verification is via **GitHub OAuth** (Auth0 or similar): user visits `/auth/verify-github`, completes GitHub flow, callback writes to `users` with developerStatus: "verified", githubId, githubUsername.
- **Master (reviewer)**:
  - `requireMasterUser()`: current user’s primary email must equal `MASTER_ALLOWED_EMAIL` and user must have signed in with Google (oauth_google / google). So a single designated reviewer email + Google sign-in.
- **Inngest trigger from Admin**: Either `x-admin-secret` header matches `ADMIN_INTERNAL_SECRET`, or the request is treated as Master user (requireMasterUser). So server-to-server call from Admin uses the secret.
- **Public marketplace**: No auth; rate limiting per request (checkPublicRateLimit).

---

## 5. Public Marketplace (app-market-place)

- **Browse**: Tabs “All”, “Featured”, “Categories”. Categories from `GET /api/categories` (DEFAULT_CATEGORIES). Apps from `GET /api/apps` (list with categoryId, search, limit, cursor) and `GET /api/apps/featured` (published apps with `featuredOrder` set, sorted by it). Both use Firestore: list published apps; featured filtered/sorted in memory.
- **App list**: Implemented via `fetchAppList` in `cached-apps.ts`: query `apps` where status === published, orderBy publishedAt, optional categoryId filter; cursor pagination; client-side filter for search (name, developer, shortDescription). Returns public app shape (no PII, no status).
- **App detail**: `GET /api/apps/[slug]` uses `fetchAppBySlug`: single app by slug if published, plus category doc and “more from developer” (other published apps same developer). 404 if not found or not published.
- **Download**: `GET /api/apps/[slug]/download` — checks published, has downloadUrl; increments downloadCount in a transaction; redirects 302 to downloadUrl (must be HTTPS). Rate limited.
- **Report**: `POST /api/report` — validated body (appId, appSlug, optional reporterEmail, reason); writes to `appReports` with status pending.

Public app type excludes internal fields (status, developerId, developerEmail, riskScore, rejectionReason, etc.).

---

## 6. Admin App (app-market-place-admin)

- **Apps**: List `GET /api/admin/apps` (by developerId), create `POST` (slug uniqueness, optional packageName uniqueness), get/patch `GET/PATCH /api/admin/apps/[slug]` (ownership via getAppIfOwned). PATCH can only set status to "draft".
- **Submit**: `POST /api/admin/apps/[slug]/submit` — see flow above; requires Idempotency-Key, developer verified.
- **Appeals**: `POST /api/admin/appeals` with appSlug and reason (validateAppealReason length).
- **Categories**: `GET /api/admin/categories` returns DEFAULT_CATEGORIES.
- **Validate/verify upload**: `POST /api/admin/validate-upload` and `api/admin/verify-upload` exist but return 501 Not Implemented.
- **Developer**: `GET /api/admin/developer` returns current user’s developer profile (developerStatus, verified, githubUsername).

Slug validation: 1–100 chars, `[a-zA-Z0-9_-]+`. Package name uniqueness enforced on create and update.

---

## 7. Master App (app-market-place-master)

- **Review queue**: Apps in `in_review` or `pending_review`; reviewer can approve, reject, or request changes (see above).
- **Appeals**: List pending appeals; resolve with upheld/rejected.
- **Reports**: List with status/appSlug filters; open report detail; resolve or dismiss with optional note.
- **Inngest**: Event `app/submitted` drives the submission pipeline. Cron `check-report-thresholds` for auto-suspend by report count.
- **Layout**: “AndroHub Master” with nav: Home, Review queue, Reports.

---

## 8. APK Extraction Service

- **Express** server; POST `/extract` body `{ apkUrl, appSlug }`.
- **Security**: apkUrl must be HTTPS; hostname not in blocked list (localhost, 127.0.0.1, metadata IP, etc.); if `ALLOWED_DOMAINS` env is set, host must match. APK size limit 50 MB.
- **Flow**: Download APK to temp file, open with adbkit-apkreader, read manifest (package, versionName, versionCode, usesSdk, usesPermissions). Returns packageName, versionName, versionCode, minSdk, targetSdk, permissions (name, protectionLevel). Temp file deleted after.
- **Rate limit**: 20 requests per 15 minutes per IP.
- **Health**: `/`, `/health`, `/ping`. Optional `SELF_PING_URL` with cron every 10 min for keep-alive.

Master’s Inngest step calls this when `EXTRACTION_SERVICE_URL` is set; otherwise skips extraction and permissions remain empty.

---

## 9. Risk & Policy

- **Risk score** (0–100+): new developer 20, no privacy policy 30, dangerous permissions up to 50, blocklist keywords up to 50, APK > 150 MB adds 10. Reject if score > 80 or any keyword hit.
- **Dangerous permissions**: READ/WRITE_CONTACTS, CALENDAR, FINE/COARSE_LOCATION, RECORD_AUDIO, CAMERA, SMS, CALL_LOG, CALL_PHONE, BODY_SENSORS, READ/WRITE_EXTERNAL_STORAGE (fixed set in constants).
- **Keyword blocklist**: casino, gambling, hack, crack, cracked, free coins, cheat, pirate, pirated. Scanned on name + shortDescription.

---

## 10. Idempotency (Admin submit)

- Header `Idempotency-Key`: 1–128 chars. Doc key = SHA256(userId + key) in `idempotencyKeys`.
- First request: set pending, run submit, then store response status/body and return.
- Replay: if doc has responseBody, return cached status/body (no 409).
- Concurrent duplicate: if doc exists with pending and no response yet, return 409.
- TTL 24 hours; after that key can be reused.

---

## 11. Rate Limiting

- **Admin**: checkAdminRateLimit(userId) on admin API routes.
- **Master**: checkMasterRateLimit(userId) on review/appeals/reports.
- **Public**: checkPublicRateLimit(req) on marketplace and report APIs.

(Exact limits are in each app’s rate-limit module.)

---

## 12. Tech Stack Summary

- **Backend**: Node (Express for extraction), Next.js API routes for Admin/Master/Client.
- **Frontend**: Next.js, React, Tailwind; UI components (e.g. shadcn-style).
- **DB**: Firebase Firestore.
- **Auth**: Clerk (Admin, Master).
- **Workflows**: Inngest (Master): `app/submitted` + cron for report thresholds.
- **APK**: adbkit-apkreader, adm-zip (if used); extraction service downloads via fetch.
- **Email**: Send rejection/approval/submission-success (implementation in Master lib/email).

---

## 13. Environment / Integration Points

- **Admin → Master**: `NEXT_PUBLIC_MASTER_URL` or `MASTER_APP_URL` + `ADMIN_INTERNAL_SECRET` for inngest-trigger.
- **Master**: `MASTER_ALLOWED_EMAIL`, `EXTRACTION_SERVICE_URL`, `REPORT_SUSPEND_THRESHOLD`, `MARKETPLACE_APP_BASE_URL` (for approval email link), Inngest config.
- **Extraction**: `PORT`, `ALLOWED_DOMAINS` (optional), `SELF_PING_URL` (optional).
- **Firebase**: Service account / env for Admin, Master, and Client (each has getDb / firebase-admin where needed).

---

## 14. Notable Conventions

- **Slug = app document ID** in Firestore (apps doc id is slug).
- **Categories** are static (DEFAULT_CATEGORIES); categoryId on app is stored and used for filtering/display.
- **Featured apps**: published apps with `featuredOrder` set; sorted by that value for featured tab.
- **Download count**: Stored as string on app; incremented in transaction on download redirect.
- **Audit**: All status changes and key actions write to auditLogs (userId, action, entityType, entityId, oldValue, newValue, timestamp).
- **Validation**: Slug and body validation live in each app’s `lib/validation`; reject/feedback max length 5000 in Master.

This document reflects the codebase as of the current implementation (including submit idempotency, appeals, reports, request-changes, risk pipeline, and extraction service).
