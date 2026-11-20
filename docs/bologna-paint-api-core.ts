/** BO-004S-B1 pure preflight: filesystem reads only; no HTTP client or credentials are imported. */
import assert from "node:assert/strict";
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import sharp from "sharp";
import { absolute, digest, inventory, pin, read, validatePreflight, verifyPins, type FilePin } from "./bologna-paint-support.ts";

export const API_ROOT = "data/bo-004s-api-runner";
export const API_APPROVAL = "docs/bologna-paint-api-approval.json";
export const OLD_APPROVAL = "449ae54fa10c297e2fdeabcbaa197d9f4ae562fb02c59149a0a84dfc2cef849d";
export const ENDPOINT = "https://api.openai.com/v1/images/edits";
export const MODEL = "gpt-image-2.6-sunburst";
export const PARAMETERS = { model: MODEL, n: 1, size: "1024x1024", quality: "high", complexity: "medium", output_format: "png", background: "opaque", stream: false } as const;
export const CLIENT = { name: "Node built-in https; no OpenAI SDK", node: "v24.22.3", maxRetries: 0, maxRequests: 1, redirects: 0, proxies: false, timeoutMs: 600000, responseByteLimit: 32 * 1024 * 1024 } as const;
export const INPUTS = ["input", "height", "style", "trees"].map(n => `data/bo-004s-paint/input/${n}.png`);
export const EXECUTION_SOURCES = ["docs/bologna-paint-api-core.ts", "docs/bologna-paint-api-attempt.ts", "docs/bologna-paint-api-https.ts", "docs/bologna-paint-api-live.ts", "docs/bologna-paint-api-plan.ts", "docs/bologna-paint-api-postqa.ts", "docs/bologna-paint-support.ts", "pipeline/src/camera.ts", "pipeline/src/places.ts", "pipeline/src/heights.ts", "pipeline/src/register.ts", "pipeline/src/paths.ts"];
export interface Approval {
  schema: "BO-004S-B1/v1"; status: "PENDING_OPERATOR_APPROVAL"; baseCommit: string; branch: string;
  area: "piazza-maggiore"; window: [-1, -1]; endpoint: string; parameters: typeof PARAMETERS; client: typeof CLIENT;
  proposedApprovalAt: string; expiresAt: string; intendedRequests: 1;
  oldManifest: FilePin; inputs: { path: string; pin: FilePin }[]; prompt: { path: string; pin: FilePin };
  sources: Record<string, FilePin>; priorSpikeFiles: Record<string, FilePin>;
  run: string; ledger: string; references: unknown;
}

/** lstat also sees dangling links; unlike existsSync it cannot silently treat them as absent. */
export function existsNoFollow(path: string) {
  try { return lstatSync(path); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
}
export function rejectSymlinks(path: string) {
  const p = resolve(path), workspace = absolute(".");
  // The supplied workspace is the trusted filesystem boundary. Do not inspect /home outside
  // that boundary: Node's read-only preflight grants repository reads, not unrelated parents.
  let at = p === workspace || p.startsWith(workspace + "/") ? workspace : parse(p).root;
  assert(!existsNoFollow(at)?.isSymbolicLink(), "SYMLINK_PATH");
  for (const part of p.slice(at.length).split("/").filter(Boolean)) { at = join(at, part); assert(!existsNoFollow(at)?.isSymbolicLink(), "SYMLINK_PATH"); }
  return p;
}
export function readRegular(path: string) {
  rejectSymlinks(path);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { assert(fstatSync(fd).isFile(), "NOT_REGULAR_FILE"); return readFileSync(fd); } finally { closeSync(fd); }
}
export function safeDestinations(base: string, run: string, ledger: string) {
  rejectSymlinks(base); rejectSymlinks(run); rejectSymlinks(ledger);
  assert.equal(resolve(run), join(resolve(base), "run-minus1-minus1"), "UNSAFE_RUN_PATH");
  assert.equal(resolve(ledger), join(resolve(base), "attempt-ledger.jsonl"), "UNSAFE_LEDGER_PATH");
  assert(!existsNoFollow(run), "OUTPUT_ALREADY_EXISTS"); assert(!existsNoFollow(ledger), "ATTEMPT_ALREADY_CONSUMED");
}
export function validateParameters(parameters: unknown, client: unknown) {
  assert.deepEqual(parameters, PARAMETERS, "UNSUPPORTED_MODEL_OR_PARAMETERS");
  assert.deepEqual(client, CLIENT, "UNSAFE_CLIENT_RETRY_OR_REQUEST_POLICY");
}
export function adaptPrompt(original: string) {
  const start = original.indexOf("\n1. input.png:"), end = original.indexOf("\nOutput exactly one square");
  assert(start > 0 && end > start, "ORIGINAL_PROMPT_STRUCTURE_CHANGED");
  return "Edit the first of these four ordered reference images into one illustrated map image. Preserve its exact geometry and use the other images only as specified below.\n" + original.slice(start + 1, end) + "\n\nReturn one opaque 1024x1024 PNG: no labels, text, watermark, border, vignette, black bands or alpha holes. Do not alter framing, camera or topology.\n";
}
export function authorization(args: string[], manifest: Approval, hash: string, now = Date.now()) {
  const a: Record<string, string> = {};
  for (const flag of args) {
    const m = /^--(window|model|requests|attempts|workers|approve|approved-at|expires)=(.+)$/.exec(flag);
    assert(m && !Object.hasOwn(a, m[1]), "UNSUPPORTED_BULK_OR_DUPLICATE_FLAG"); a[m[1]] = m[2];
  }
  assert.equal(a.window, "-1,-1", "WRONG_WINDOW"); assert.equal(a.model, MODEL, "UNSPECIFIED_OR_WRONG_MODEL");
  for (const p of ["requests", "attempts", "workers"]) assert.equal(a[p], "1", "UNSAFE_REQUEST_OR_WORKER_COUNT");
  assert.notEqual(a.approve, OLD_APPROVAL, "OLD_APPROVAL_INVALID_FOR_API"); assert.equal(a.approve, hash, "APPROVAL_HASH_MISMATCH");
  assert.equal(a["approved-at"], manifest.proposedApprovalAt, "APPROVAL_TIME_MISMATCH"); assert.equal(a.expires, manifest.expiresAt, "EXPIRY_MISMATCH");
  const start = Date.parse(a["approved-at"]), end = Date.parse(a.expires);
  assert(Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end && end - start <= 24 * 3600000 && end > start, "STALE_OR_INVALID_APPROVAL");
}
export function proposedCommand(m: Approval, hash: string) {
  return `node --import tsx docs/bologna-paint-api-live.ts --window=-1,-1 --model=${MODEL} --requests=1 --attempts=1 --workers=1 --approve=${hash} --approved-at=${m.proposedApprovalAt} --expires=${m.expiresAt}`;
}
export function environmentStatus(env: NodeJS.ProcessEnv) {
  return { apiKeyPresent: Boolean(env.OPENAI_API_KEY), proxyPresent: ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy", "NODE_USE_ENV_PROXY"].some(k => Boolean(env[k])), customEndpointPresent: Boolean(env.OPENAI_BASE_URL) };
}
export async function validateApiManifest() {
  const old = await validatePreflight(); assert.equal(old.hash, OLD_APPROVAL, "FROZEN_OLD_MANIFEST_CHANGED");
  const bytes = readRegular(absolute(API_APPROVAL)), hash = digest(bytes), m = JSON.parse(bytes.toString()) as Approval;
  assert.equal(m.schema, "BO-004S-B1/v1"); assert.equal(m.status, "PENDING_OPERATOR_APPROVAL");
  assert.equal(m.area, "piazza-maggiore"); assert.deepEqual(m.window, [-1, -1]); assert.equal(m.endpoint, ENDPOINT);
  assert.equal(m.intendedRequests, 1); validateParameters(m.parameters, m.client); assert.equal(process.version, m.client.node, "RUNTIME_CHANGED_REFRESH_APPROVAL");
  assert.deepEqual(m.oldManifest, pin("docs/bologna-paint-input-manifest.json"));
  assert.deepEqual(m.inputs.map(i => i.path), INPUTS, "EXACT_FOUR_ORDERED_INPUTS_REQUIRED");
  const images: Buffer[] = [], imageChecks = [];
  for (const [index, i] of m.inputs.entries()) {
    assert.deepEqual(pin(i.path), old.m.inputs[i.path], "ORIGINAL_INPUT_HASH_CHANGED");
    const b = readRegular(absolute(i.path)); assert.deepEqual({ sha256: digest(b), bytes: b.length }, i.pin);
    assert(b.length < 50 * 1024 * 1024 && b.length * 4 / 3 + 30 < 20971520, "IMAGE_OR_DATA_URL_TOO_LARGE");
    const meta = await sharp(b).metadata(); assert.equal(meta.format, "png");
    assert.deepEqual([meta.width, meta.height], index === 2 ? [2048, 1024] : [1024, 1024]);
    images.push(b); imageChecks.push({ path: i.path, width: meta.width, height: meta.height, bytes: b.length, sha256: digest(b), format: meta.format });
  }
  assert.deepEqual(Object.keys(m.sources).sort(), EXECUTION_SOURCES.slice().sort(), "MISSING_OR_UNEXPECTED_EXECUTION_SOURCE");
  verifyPins(m.sources); verifyPins(m.priorSpikeFiles);
  const research = m.references as { research: string; researchPin: FilePin };
  assert.equal(research.research, "docs/bologna-paint-api-research.json");
  assert.deepEqual(pin(research.research), research.researchPin, "PRICING_OR_CAPABILITY_RESEARCH_CHANGED");
  assert.equal(m.prompt.path, API_ROOT + "/prompt.txt");
  const prompt = readRegular(absolute(m.prompt.path)); assert.deepEqual({ sha256: digest(prompt), bytes: prompt.length }, m.prompt.pin);
  assert.equal(prompt.toString(), adaptPrompt(readRegular(absolute("data/bo-004s-paint/prompts/prompt.txt")).toString()), "PROMPT_CONSTRAINTS_CHANGED");
  assert(prompt.length <= 32000, "PROMPT_LIMIT");
  assert.equal(m.run, API_ROOT + "/run-minus1-minus1"); assert.equal(m.ledger, API_ROOT + "/attempt-ledger.jsonl");
  safeDestinations(absolute(API_ROOT), absolute(m.run), absolute(m.ledger));
  // New files inside a protected data root are changes too, even if old file hashes still match.
  const roots = old.m.protectedRoots.filter(p => p.existed).map(p => p.path);
  const expected = Object.keys(old.m.preservation).filter(p => roots.some(r => p.startsWith(r + "/"))).sort();
  assert.deepEqual(Object.keys(inventory(roots)).sort(), expected, "PROTECTED_ROOT_MEMBERSHIP_CHANGED");
  const body = Buffer.from(JSON.stringify({ ...m.parameters, prompt: prompt.toString(), images: images.map(b => ({ image_url: "data:image/png;base64," + b.toString("base64") })) }));
  return { m, hash, body, imageChecks, protectedFiles: old.protectedFiles, originalSpikeFiles: Object.keys(m.priorSpikeFiles).length, prompt: m.prompt.pin };
}
