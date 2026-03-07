/**
 * APK Extraction Service
 * POST /extract { apkUrl, appSlug }
 */
import express from "express";
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { randomBytes } from "crypto";
import cron from "node-cron";
import ApkReader from "adbkit-apkreader";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const MAX_APK_BYTES = 50 * 1024 * 1024;

const SELF_PING_URL = process.env.SELF_PING_URL?.replace(/\/$/, "");
const KEEP_ALIVE_CRON = "*/10 * * * *";

const extractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window`
  message: { error: "Too many extraction requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});



function isUrlAllowed(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname;
    const blockedHostnames = [
      "localhost", "127.0.0.1", "169.254.169.254", "0.0.0.0", "::1"
    ];
    if (blockedHostnames.includes(hostname)) return false;

    if (process.env.ALLOWED_DOMAINS) {
      const allowed = process.env.ALLOWED_DOMAINS.split(',').map(s => s.trim());
      if (!allowed.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}



async function downloadAPK(url, filePath) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "APKExtractionService/1.0"
    }
  });

  if (!res.ok)
    throw new Error(`Download failed: ${res.status}`);

  const length = res.headers.get("content-length");

  if (length && Number(length) > MAX_APK_BYTES)
    throw new Error("APK too large");

  const dest = createWriteStream(filePath);

  await pipeline(res.body, dest);

  return filePath;
}



async function parseManifest(apkPath) {
  const reader = await ApkReader.open(apkPath);
  const manifest = await reader.readManifest();

  const permissions = (manifest.usesPermissions || []).map((p) => ({
    name: typeof p === "string" ? p : (p?.name ?? ""),
    protectionLevel: typeof p === "object" && p?.protectionLevel != null ? p.protectionLevel : "unknown"
  }));

  return {
    packageName: manifest.package ?? null,
    versionName: manifest.versionName ?? null,
    versionCode: manifest.versionCode ?? null,
    minSdk: manifest.usesSdk?.minSdkVersion ?? null,
    targetSdk: manifest.usesSdk?.targetSdkVersion ?? null,
    permissions
  };
}



app.post("/extract", extractLimiter, async (req, res) => {
  const { apkUrl, appSlug } = req.body || {};

  if (!apkUrl)
    return res.status(400).json({ error: "apkUrl required" });

  if (!isUrlAllowed(apkUrl)) {
    return res.status(403).json({ error: "Invalid apkUrl. Must be a permitted external HTTPS URL." });
  }

  let tmpPath;

  try {
    const dir = join(tmpdir(), "apk-extract");

    if (!existsSync(dir))
      mkdirSync(dir, { recursive: true });

    tmpPath = join(
      dir,
      `app-${appSlug || randomBytes(6).toString("hex")}-${Date.now()}.apk`
    );

    console.log("Downloading APK:", apkUrl);

    await downloadAPK(apkUrl, tmpPath);

    console.log("Parsing manifest...");

    const result = await parseManifest(tmpPath);
    console.log("result", result);
    res.json(result);

  } catch (err) {
    console.error("Extraction error:", err);

    res.status(500).json({
      error: err?.message || "Extraction failed"
    });
  } finally {
    if (tmpPath && existsSync(tmpPath)) {
      try { unlinkSync(tmpPath); } catch { }
    }
  }
});



app.get("/", (_, res) => {
  res.json({ service: "apk-extraction", ok: true });
});

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

app.get("/ping", (_, res) => {
  res.json({ pong: true, ts: Date.now() });
});



async function keepAlivePing() {
  if (!SELF_PING_URL) return;

  try {
    await fetch(`${SELF_PING_URL}/ping`);
  } catch (err) {
    console.warn("Keep-alive ping failed:", err?.message);
  }
}



app.listen(PORT, () => {
  console.log(`APK extraction service running on port ${PORT}`);

  if (SELF_PING_URL) {
    cron.schedule(KEEP_ALIVE_CRON, keepAlivePing);
  }
});