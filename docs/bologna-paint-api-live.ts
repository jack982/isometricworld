/** Opt-in future live request. Importing this file is not a test: use the injected attempt module. */
import assert from "node:assert/strict";
import { absolute } from "./bologna-paint-support.ts";
import { API_ROOT, authorization, environmentStatus, validateApiManifest } from "./bologna-paint-api-core.ts";
import { executeAttempt } from "./bologna-paint-api-attempt.ts";

const p = await validateApiManifest();
authorization(process.argv.slice(2), p.m, p.hash);
const env = environmentStatus(process.env);
assert(env.apiKeyPresent, "API_KEY_ABSENT");
assert(!env.proxyPresent && !env.customEndpointPresent, "PROXY_OR_CUSTOM_ENDPOINT_FORBIDDEN");
// No .env loading, model discovery, account probe, file upload, URL fetch, SDK retry or fallback.
const { oneRequestTransport } = await import("./bologna-paint-api-https.ts");
const result = await executeAttempt({ base: absolute(API_ROOT), run: absolute(p.m.run), ledger: absolute(p.m.ledger), approvalHash: p.hash,
  approvedAt: p.m.proposedApprovalAt, expiresAt: p.m.expiresAt, model: p.m.parameters.model, body: p.body,
  inputs: p.m.inputs, promptHash: p.m.prompt.pin.sha256, key: process.env.OPENAI_API_KEY!, maxRetries: 0, transport: oneRequestTransport() });
console.log(JSON.stringify({ status: result.status, metadata: p.m.run + "/metadata.json", applicationInitiatedRequests: result.applicationInitiatedRequests }));
if (result.status === "ATTEMPT_FAILED_NO_RETRY") process.exitCode = 1;
