/** Read-only preflight. No transport import, upload, credential validation request or output creation. */
import assert from "node:assert/strict";
import { environmentStatus, proposedCommand, validateApiManifest } from "./bologna-paint-api-core.ts";
assert(process.argv.slice(2).every(a => a === "--dry-run"), "PREFLIGHT_ONLY_SUPPORTS_DRY_RUN");
const p = await validateApiManifest();
console.log(JSON.stringify({ status: "PENDING_OPERATOR_APPROVAL", manifestSha256: p.hash, parameters: p.m.parameters, client: p.m.client,
  proposedApprovalAt: p.m.proposedApprovalAt, expiresAt: p.m.expiresAt, approvalWindowExpired: Date.now() >= Date.parse(p.m.expiresAt),
  images: p.imageChecks, prompt: p.prompt, protectedFiles: p.protectedFiles, originalSpikeFiles: p.originalSpikeFiles,
  applicationRequestsMade: 0, uploadsMade: 0, writes: 0, requestBodyBytes: p.body.length,
  credentialStatus: environmentStatus(process.env), proposedCommand: proposedCommand(p.m, p.hash), run: p.m.run, ledger: p.m.ledger,
  guarantee: "At most one application-initiated HTTP request per pinned attempt; not a provider-internal operation count or dollar ceiling", sdkVersion: "none; Node https " + process.version,
}, null, 2));
