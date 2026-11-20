/** Read-only BO-004S preflight. Deliberately has no executable provider dependency. */
import assert from "node:assert/strict";
import { liveCommand, validatePreflight } from "./bologna-paint-support.ts";

assert(process.argv.slice(2).every(a => a === "--dry-run"), "Only --dry-run is supported; generation is a separate approval-gated entry point");
const r = await validatePreflight();
const expires = new Date(Date.now() + 23 * 3600_000).toISOString();
console.log(JSON.stringify({
  status: "STOP_BEFORE_LIVE", validation: "PASS_PREPARATION", liveReadiness: "BLOCKED_NATIVE_IMAGE_CALL_CAP",
  manifestSha256: r.hash, protectedFiles: r.protectedFiles, inputImages: r.inputImages,
  sourcePairs: r.sourcePairs, window: r.m.window, promptSha256: r.m.artifacts["data/bo-004s-paint/prompts/prompt.txt"].sha256,
  intendedImageCalls: 1, observedImageCalls: 0, retries: 0, workers: 1, overwrite: r.overwrite,
  writes: r.writes, liveReady: r.liveReady, blocker: r.blocker,
  commandForSeparateApproval: liveCommand(r.hash, expires),
  commandWarning: "This exact wrapper currently refuses live execution even with matching approval, until a native tool-call cap is verifiable. Do not substitute the ordinary multi-attempt painter.",
  destinations: ["data/bo-004s-paint/run/-1_-1/raw.png", "data/bo-004s-paint/run/-1_-1/registered.png", "data/bo-004s-paint/run/-1_-1/events.jsonl", "data/bo-004s-paint/run/-1_-1/qa.json"],
  backend: r.m.backend, usdSpend: "not applicable / unknown; no generation or billable request made",
}, null, 2));
