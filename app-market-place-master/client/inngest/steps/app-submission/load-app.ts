import type { DocumentReference } from "firebase-admin/firestore";
import type { LoadAppResult, StepLogger } from "./types";

export async function loadAppStep(
  slug: string,
  appRef: DocumentReference,
  logger: StepLogger
): Promise<LoadAppResult> {
  logger.info("Loading app document", { slug });
  const snap = await appRef.get();
  if (!snap.exists) {
    logger.error("App not found", { slug });
    throw new Error(`App not found: ${slug}`);
  }
  const data = snap.data()!;
  const status = data.status as string;
  if (status !== "pending_review") {
    logger.info("Skipping: app not in pending_review", { slug, status });
    return { skip: true, status };
  }
  logger.info("App loaded successfully", { slug, appId: snap.id });
  return { skip: false, app: data, id: snap.id };
}
