/** One durable attempt; HTTP is injected, so offline tests cannot reach a provider accidentally. */
import assert from "node:assert/strict";
import { closeSync, constants, fsyncSync, mkdirSync, openSync, writeFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { CLIENT } from "./bologna-paint-api-core.ts";
import { digest } from "./bologna-paint-support.ts";
import { safeDestinations } from "./bologna-paint-api-core.ts";

export class AttemptError extends Error { constructor(readonly code: string) { super(code); this.name = "AttemptError"; } }
export interface TransportResponse { status: number; contentType: string; requestId?: string | string[]; body: Buffer }
export type Transport = (body: Buffer, key: string) => Promise<TransportResponse>;
export interface Attempt {
  base: string; run: string; ledger: string; approvalHash: string; approvedAt: string; expiresAt: string;
  model: string; body: Buffer; inputs: unknown; promptHash: string; key: string; maxRetries: number; transport: Transport;
}
function numericUsage(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (!/^(total_tokens|input_tokens|output_tokens|input_tokens_details|text_tokens|image_tokens|cached_tokens)$/.test(key)) continue;
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[key] = v;
    else if (typeof v === "object") out[key] = numericUsage(v);
  }
  return out;
}
export async function executeAttempt(a: Attempt) {
  assert.equal(a.maxRetries, CLIENT.maxRetries, "RETRIES_FORBIDDEN");
  assert(a.key && !/[\r\n]/.test(a.key), "API_KEY_ABSENT_OR_INVALID");
  safeDestinations(a.base, a.run, a.ledger);
  mkdirSync(a.run, { mode: 0o700 }); // atomic fail-if-exists; never resume a partial directory
  const fd = openSync(a.ledger, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_APPEND | constants.O_NOFOLLOW, 0o600);
  const event = (value: unknown) => { writeSync(fd, JSON.stringify(value) + "\n"); fsyncSync(fd); };
  const metadata: Record<string, unknown> = { status: "ATTEMPT_STARTED", approvalHash: a.approvalHash, approvedAt: a.approvedAt, expiresAt: a.expiresAt, startedAt: new Date().toISOString(), requestedModel: a.model, client: CLIENT, intendedRequests: 1, inputHashes: a.inputs, promptHash: a.promptHash, requestBodySha256: digest(a.body), actualBilledUsd: "unknown", potentiallyBillable: true };
  let calls = 0, initiated = 0;
  try {
    event({ event: "ATTEMPT_STARTED", at: metadata.startedAt, approvalHash: a.approvalHash, intendedRequests: 1 });
    // Persist the directory entries for both the run and exclusive ledger before network I/O.
    const parent = openSync(a.base, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try { fsyncSync(parent); } finally { closeSync(parent); }
    // The durable, exclusive ledger above is committed immediately before invoking transport.
    initiated = 1;
    const response = await a.transport(a.body, a.key); calls++;
    metadata.httpStatus = response.status;
    const id = response.requestId;
    if (typeof id === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(id) && !id.includes(a.key)) metadata.requestId = id;
    if (response.status < 200 || response.status >= 300) throw new AttemptError("HTTP_FAILURE");
    if (!/^application\/json\b/i.test(response.contentType)) throw new AttemptError("INVALID_RESPONSE_TYPE");
    let value: Record<string, unknown>;
    try { value = JSON.parse(response.body.toString()); } catch { throw new AttemptError("INVALID_JSON"); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new AttemptError("INVALID_RESPONSE");
    metadata.usage = numericUsage(value.usage);
    if (value.model !== undefined && value.model !== a.model) throw new AttemptError("UNEXPECTED_MODEL");
    metadata.returnedModel = value.model === a.model ? a.model : null;
    const data = value.data;
    if (!Array.isArray(data) || data.length !== 1) throw new AttemptError("PARTIAL_OR_MULTIPLE_RESULTS");
    const encoded = data[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new AttemptError("INVALID_BASE64_RESULT");
    const raw = Buffer.from(encoded, "base64");
    // Save exact raw bytes before decoding/QA; malformed results are retained without repainting.
    writeFileSync(join(a.run, "raw.png"), raw, { flag: "wx", mode: 0o600 });
    metadata.rawSha256 = digest(raw); metadata.rawBytes = raw.length;
    let image;
    try { image = await sharp(raw).metadata(); } catch { throw new AttemptError("MALFORMED_PNG"); }
    if (image.format !== "png" || image.width !== 1024 || image.height !== 1024) throw new AttemptError("INVALID_IMAGE_FORMAT_OR_SIZE");
    const rgba = await sharp(raw).ensureAlpha().raw().toBuffer();
    for (let k = 3; k < rgba.length; k += 4) if (rgba[k] !== 255) throw new AttemptError("ALPHA_HOLES");
    metadata.status = "RAW_RESULT_SAVED_PENDING_QA_AND_HUMAN";
    event({ event: "ATTEMPT_COMPLETED", at: new Date().toISOString(), rawSha256: metadata.rawSha256, requests: 1 });
  } catch (error) {
    // Never persist arbitrary provider/transport error text, headers, response bodies or key material.
    metadata.status = "ATTEMPT_FAILED_NO_RETRY";
    metadata.error = error instanceof AttemptError && /^[A-Z_]+$/.test(error.code) ? error.code : "AMBIGUOUS_NETWORK_OR_CLIENT_FAILURE";
    event({ event: "ATTEMPT_FAILED_NO_RETRY", at: new Date().toISOString(), error: metadata.error, potentiallyBillable: true });
  } finally {
    metadata.finishedAt = new Date().toISOString(); metadata.applicationInitiatedRequests = initiated;
    metadata.operatorCommandAt = metadata.startedAt; // proposed approval-window start is not an observed human approval time
    // A thrown transport still consumed one potentially billable attempt; never infer zero from calls.
    metadata.responseCompleted = calls === 1;
    try { writeFileSync(join(a.run, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n", { flag: "wx", mode: 0o600 }); } finally { closeSync(fd); }
  }
  return metadata;
}
