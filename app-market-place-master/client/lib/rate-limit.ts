import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const RATE_LIMIT_REQUESTS = Math.max(1, parseInt(process.env.RATE_LIMIT_REQUESTS ?? "100", 10) || 100);
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW ?? "1 m";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW),
  prefix: "master-api",
});

export async function checkMasterRateLimit(
  userId: string
): Promise<NextResponse | null> {
  try {
    const { success, reset } = await ratelimit.limit(userId);
    if (success) return null;
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  } catch {
    return null;
  }
}
