import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { appSubmitted, checkReportThresholds } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [appSubmitted, checkReportThresholds],
});
