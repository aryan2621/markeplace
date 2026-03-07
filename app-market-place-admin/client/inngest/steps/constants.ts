export const POLICY_BLOCKLIST = [
  "casino",
  "gambling",
  "hack",
  "crack",
  "cracked",
  "free coins",
  "cheat",
  "pirate",
  "pirated",
] as const;

export const DANGEROUS_PERMISSIONS = new Set([
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.READ_CALENDAR",
  "android.permission.WRITE_CALENDAR",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.RECORD_AUDIO",
  "android.permission.CAMERA",
  "android.permission.READ_SMS",
  "android.permission.RECEIVE_SMS",
  "android.permission.SEND_SMS",
  "android.permission.READ_CALL_LOG",
  "android.permission.WRITE_CALL_LOG",
  "android.permission.CALL_PHONE",
  "android.permission.BODY_SENSORS",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
]);

export const REPORT_SUSPEND_THRESHOLD = Number(process.env.REPORT_SUSPEND_THRESHOLD) || 10;

export const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL ?? "";
