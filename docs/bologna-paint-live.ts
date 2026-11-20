/** BO-004S safety gate, NOT a covert one-process-as-one-image launcher. No provider is invoked. */
import { approvalCheck, CAP_BLOCKER, pin, MANIFEST, validatePreflight } from "./bologna-paint-support.ts";

// Reject unsafe/broad CLI requests before even reading the imagery. A future backend must still
// preserve these gates, revalidate its own pinned implementation and consume a one-shot ledger.
approvalCheck(process.argv.slice(2), pin(MANIFEST).sha256);
await validatePreflight();
// The installed CLI exposes image_generation=true, not a verified native image-call budget.
// Killing a second JSON event is too late; prompt wording is not enforcement. Fail closed.
throw new Error(CAP_BLOCKER + "; no model process started, no output created, no approval consumed");
