import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CATEGORIES } from "@/lib/constants/categories";
import { checkPublicRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimitRes = await checkPublicRateLimit(req);
  if (rateLimitRes) return rateLimitRes;
  return NextResponse.json(DEFAULT_CATEGORIES);
}
