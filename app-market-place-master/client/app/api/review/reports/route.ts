import { FieldPath } from "firebase-admin/firestore";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { checkMasterRateLimit } from "@/lib/rate-limit";
import { requireMasterUser } from "@/lib/master-allowlist";
import { COLLECTIONS } from "@/lib/firestore-collections";
import { logRequest, logStep, logResponse, logError } from "@/lib/api-logger";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

function toReportEntry(id: string, data: FirebaseFirestore.DocumentData) {
  const status = (data.status as string) ?? "pending";
  return {
    id,
    appId: data.appId,
    appSlug: data.appSlug,
    reporterEmail: data.reporterEmail,
    reason: data.reason,
    status,
    createdAt: data.createdAt ?? null,
    resolvedAt: data.resolvedAt ?? null,
    resolvedBy: data.resolvedBy ?? null,
    resolutionNote: data.resolutionNote ?? null,
  };
}

export async function GET(req: NextRequest) {
  const route = "GET /api/review/reports";
  const start = Date.now();
  const { userId } = await auth();
  logRequest(route, "GET", { userId: userId ?? undefined });
  if (!userId) {
    logStep(route, "auth_failed", { status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowRes = await requireMasterUser();
  if (allowRes) {
    logStep(route, "auth_failed", { status: 403 });
    return allowRes;
  }
  const rateLimitRes = await checkMasterRateLimit(userId);
  if (rateLimitRes) {
    logStep(route, "rate_limited", { status: 429 });
    return rateLimitRes;
  }
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") ?? undefined;
    const appSlugParam = searchParams.get("appSlug") ?? undefined;
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const cursor = searchParams.get("cursor") ?? undefined;

    const db = getDb();
    const col = db.collection(COLLECTIONS.appReports);

    let query = col.orderBy(FieldPath.documentId()).limit(limit + 1);
    if (statusParam) {
      const s = statusParam.toLowerCase();
      if (s === "resolved" || s === "dismissed") {
        query = col.where("status", "==", s).orderBy(FieldPath.documentId()).limit(limit + 1);
      }
      else if (s === "pending") {
        query = col.orderBy(FieldPath.documentId()).limit(limit + 1);
      }
    }

    if (cursor) {
      const cursorSnap = await col.doc(cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const snap = await query.get();
    let docs = snap.docs;

    if (statusParam?.toLowerCase() === "pending") {
      docs = docs.filter((d) => {
        const st = d.data().status as string | undefined;
        return !st || st === "pending";
      });
    }
    if (appSlugParam) {
      docs = docs.filter(
        (d) =>
          (d.data().appSlug as string) === appSlugParam || (d.data().appId as string) === appSlugParam
      );
    }

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;
    const reports = page.map((d) => toReportEntry(d.id, d.data()));
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    logResponse(route, 200, Date.now() - start, { count: reports.length });
    return NextResponse.json({ reports, nextCursor });
  } catch (e) {
    logError(route, e, { status: 500, durationMs: Date.now() - start });
    const message = e instanceof Error ? e.message : "Failed to list reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
