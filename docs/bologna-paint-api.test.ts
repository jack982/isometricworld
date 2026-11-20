/** Offline only: no real transport imported. Successful mock output is the existing input bytes. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import sharp from "sharp";
import { absolute, digest, pin, REPO, verifyPins } from "./bologna-paint-support.ts";
import { adaptPrompt, API_APPROVAL, API_ROOT, authorization, CLIENT, ENDPOINT, environmentStatus, existsNoFollow, MODEL, OLD_APPROVAL, PARAMETERS, proposedCommand, readRegular, safeDestinations, validateApiManifest, validateParameters, type Approval } from "./bologna-paint-api-core.ts";
import { AttemptError, executeAttempt, type Attempt, type Transport, type TransportResponse } from "./bologna-paint-api-attempt.ts";
import { anchorDrift, postQaMetrics } from "./bologna-paint-api-postqa.ts";

const original = readFileSync(absolute("data/bo-004s-paint/input/input.png"));
const frozenPrompt = readFileSync(absolute("data/bo-004s-paint/prompts/prompt.txt"), "utf8");
const key = "test-secret-never-log", hash = "a".repeat(64), now = Date.parse("2026-11-20T12:00:00Z");
const manifest = { proposedApprovalAt: "2026-11-20T11:00:00Z", expiresAt: "2026-11-20T13:00:00Z" } as Approval;
const flags = (h = hash) => [`--window=-1,-1`, `--model=${MODEL}`, "--requests=1", "--attempts=1", "--workers=1", `--approve=${h}`, `--approved-at=${manifest.proposedApprovalAt}`, `--expires=${manifest.expiresAt}`];
const success = (): TransportResponse => ({ status: 200, contentType: "application/json", requestId: "req_mock", body: Buffer.from(JSON.stringify({ model: MODEL, data: [{ b64_json: original.toString("base64") }], usage: { input_tokens: 123, output_tokens: 456, input_tokens_details: { text_tokens: 12, image_tokens: 111 } } })) });
function fixture(transport: Transport): Attempt {
  const base = mkdtempSync(join(tmpdir(), "bo-004s-api-mock-"));
  return { base, run: join(base, "run-minus1-minus1"), ledger: join(base, "attempt-ledger.jsonl"), approvalHash: hash, approvedAt: manifest.proposedApprovalAt, expiresAt: manifest.expiresAt, model: MODEL, body: Buffer.from("OFFLINE_FIXTURE_NOT_SENT"), inputs: [], promptHash: "b".repeat(64), key, maxRetries: 0, transport };
}
test("exact supported request combination and fresh new authorization pass", () => {
  validateParameters(PARAMETERS, CLIENT); authorization(flags(), manifest, hash, now);
  assert(proposedCommand(manifest, hash).includes("--model=" + MODEL));
});
test("old, absent and mismatched approval hashes fail", () => {
  for (const h of [OLD_APPROVAL, "b".repeat(64), ""]) assert.throws(() => authorization(flags(h), manifest, hash, now));
  assert.throws(() => authorization(flags().filter(f => !f.startsWith("--approve=")), manifest, hash, now));
});
test("expired, future, altered and overlong approval windows fail", () => {
  assert.throws(() => authorization(flags(), manifest, hash, now + 2 * 3600000), /STALE/);
  assert.throws(() => authorization(flags(), manifest, hash, now - 2 * 3600000), /STALE/);
  assert.throws(() => authorization(flags().map(f => f.startsWith("--expires=") ? "--expires=2099-01-01T00:00:00Z" : f), manifest, hash, now), /EXPIRY/);
  const long = { ...manifest, expiresAt: "2026-11-23T13:00:00Z" };
  assert.throws(() => authorization(flags().map(f => f.startsWith("--expires=") ? `--expires=${long.expiresAt}` : f), long, hash, now), /STALE/);
});
test("alternate windows, unspecified models, bulk flags, duplicates and counts greater than one fail", () => {
  for (const f of ["--near=44,11", "--parts", "--force", "--output=/tmp", "--backend=fal", "--model=auto"]) assert.throws(() => authorization([...flags(), f], manifest, hash, now));
  for (const target of ["window", "model", "requests", "attempts", "workers"]) assert.throws(() => authorization(flags().filter(f => !f.startsWith(`--${target}=`)), manifest, hash, now));
  for (const target of ["requests", "attempts", "workers"]) assert.throws(() => authorization(flags().map(f => f.startsWith(`--${target}=`) ? `--${target}=2` : f), manifest, hash, now));
});
test("unsupported quality, size, model, count, fidelity and retry settings fail", () => {
  for (const change of [{ quality: "auto" }, { size: "2048x2048" }, { model: "gpt-image-1" }, { n: 2 }, { input_fidelity: "high" }, { stream: true }]) assert.throws(() => validateParameters({ ...PARAMETERS, ...change }, CLIENT));
  assert.throws(() => validateParameters(PARAMETERS, { ...CLIENT, maxRetries: 2 }));
});
test("direct-edit prompt keeps every interior geometry/reference constraint and removes autonomous instructions", () => {
  const p = adaptPrompt(frozenPrompt);
  assert(p.includes(frozenPrompt.slice(frozenPrompt.indexOf("\n1. input.png:") + 1, frozenPrompt.indexOf("\nOutput exactly one square"))));
  assert(!/built-in image generation tool|designated isolated raw output path|copy the final/.test(p));
  assert(p.includes("courtyard void") && p.includes("clock faces") && p.includes("back-facing"));
});
test("credential check only exposes booleans, never values", () => {
  const state = environmentStatus({ OPENAI_API_KEY: key, HTTPS_PROXY: key });
  assert.equal(state.apiKeyPresent, true); assert.equal(state.proxyPresent, true); assert(!JSON.stringify(state).includes(key));
});
test("successful fake request consumes exactly one durable attempt and preserves raw bytes", async () => {
  let calls = 0; const a = fixture(async () => { calls++; assert(readFileSync(a.ledger, "utf8").includes("ATTEMPT_STARTED")); return success(); });
  const r = await executeAttempt(a); assert.equal(calls, 1); assert.equal(r.applicationInitiatedRequests, 1); assert.equal(r.status, "RAW_RESULT_SAVED_PENDING_QA_AND_HUMAN");
  assert.equal(digest(readFileSync(join(a.run, "raw.png"))), digest(original));
  assert.equal(readFileSync(a.ledger, "utf8").trim().split("\n").length, 2);
  await assert.rejects(executeAttempt(a), /OUTPUT_ALREADY_EXISTS|ATTEMPT_ALREADY/); assert.equal(calls, 1);
});
for (const code of ["TIMEOUT", "NETWORK_DISCONNECT", "QUOTA", "RATE_LIMIT"]) test(`fake ${code} never retries and remains potentially billable`, async () => {
  let calls = 0; const a = fixture(async () => { calls++; throw new AttemptError(code); }); const r = await executeAttempt(a);
  assert.equal(calls, 1); assert.equal(r.status, "ATTEMPT_FAILED_NO_RETRY"); assert.equal(r.potentiallyBillable, true); assert.equal(r.applicationInitiatedRequests, 1);
  await assert.rejects(executeAttempt(a)); assert.equal(calls, 1);
});
for (const status of [301, 400, 401, 403, 408, 429, 500, 503]) test(`HTTP ${status} causes no redirect, retry or fallback`, async () => {
  let calls = 0; const a = fixture(async () => { calls++; return { ...success(), status }; }); const r = await executeAttempt(a);
  assert.equal(calls, 1); assert.equal(r.error, "HTTP_FAILURE"); assert.equal(r.httpStatus, status);
});
for (const [name, value, type] of [
  ["invalid-json", "not json", "application/json"], ["wrong-content-type", "not json", "text/html"],
  ["missing-result", { data: [] }, "application/json"], ["multiple-results", { data: [{}, {}] }, "application/json"],
  ["url-result", { data: [{ url: "https://example.com/never-fetch" }] }, "application/json"],
  ["malformed-base64", { data: [{ b64_json: "not_base64" }] }, "application/json"],
  ["malformed-png", { data: [{ b64_json: Buffer.from("not a PNG").toString("base64") }] }, "application/json"],
  ["other-model", { model: "fallback-model", data: [] }, "application/json"],
] as const) test(`fake ${name} stops after one attempt`, async () => {
  let calls = 0; const a = fixture(async () => { calls++; return { status: 200, contentType: type, body: Buffer.from(typeof value === "string" ? value : JSON.stringify(value)) }; });
  const r = await executeAttempt(a); assert.equal(calls, 1); assert.equal(r.status, "ATTEMPT_FAILED_NO_RETRY");
  if (name === "malformed-png") assert(existsNoFollow(join(a.run, "raw.png")), "Retain bad raw output; never repaint");
});
test("malicious error text and usage fields do not enter metadata", async () => {
  const a = fixture(async () => { throw new Error(key); }); await executeAttempt(a); assert(!readFileSync(join(a.run, "metadata.json"), "utf8").includes(key));
  const b = fixture(async () => ({ ...success(), requestId: key, body: Buffer.from(JSON.stringify({ data: [{ b64_json: original.toString("base64") }], usage: { secret: key, output_tokens: 50 } })) }));
  await executeAttempt(b); assert(!readFileSync(join(b.run, "metadata.json"), "utf8").includes(key));
});
test("wrong-sized and transparent mock results fail without another request", async () => {
  for (const [size, alpha] of [[8, 1], [1024, 0]]) {
    const image = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 20, g: 40, b: 60, alpha } } }).png().toBuffer();
    let calls = 0; const a = fixture(async () => { calls++; return { ...success(), body: Buffer.from(JSON.stringify({ data: [{ b64_json: image.toString("base64") }] })) }; });
    const r = await executeAttempt(a); assert.equal(calls, 1); assert.equal(r.status, "ATTEMPT_FAILED_NO_RETRY"); assert.equal(r.error, size === 8 ? "INVALID_IMAGE_FORMAT_OR_SIZE" : "ALPHA_HOLES");
    assert.equal(digest(readFileSync(join(a.run, "raw.png"))), digest(image));
  }
});
test("absent credentials and configured retries fail before output/ledger/network", async () => {
  let calls = 0; const a = fixture(async () => { calls++; return success(); });
  await assert.rejects(executeAttempt({ ...a, key: "" }), /API_KEY/);
  await assert.rejects(executeAttempt({ ...a, maxRetries: 1 }), /RETRIES/);
  assert.equal(calls, 0); assert(!existsNoFollow(a.run)); assert(!existsNoFollow(a.ledger));
});
test("pre-existing run, attempted ledger and unsafe paths block before HTTP", async () => {
  let calls = 0; const a = fixture(async () => { calls++; return success(); }); mkdirSync(a.run);
  await assert.rejects(executeAttempt(a), /OUTPUT_ALREADY_EXISTS/);
  const b = fixture(a.transport); writeFileSync(b.ledger, "previous attempt\n"); await assert.rejects(executeAttempt(b), /ATTEMPT_ALREADY/);
  assert.throws(() => safeDestinations(b.base, join(b.base, "../escape"), b.ledger), /UNSAFE/); assert.equal(calls, 0);
});
test("input, output, parent and dangling symlink tricks fail closed", async () => {
  let calls = 0; const a = fixture(async () => { calls++; return success(); }); symlinkSync("/tmp/missing-bo004s-target", a.run);
  await assert.rejects(executeAttempt(a), /SYMLINK/);
  const parent = mkdtempSync(join(tmpdir(), "bo-api-link-")), real = mkdtempSync(join(tmpdir(), "bo-api-real-")), link = join(parent, "linked"); symlinkSync(real, link);
  assert.throws(() => safeDestinations(link, join(link, "run-minus1-minus1"), join(link, "attempt-ledger.jsonl")), /SYMLINK/);
  const img = join(parent, "input.png"); symlinkSync(absolute("data/bo-004s-paint/input/input.png"), img); assert.throws(() => readRegular(img), /SYMLINK/); assert.equal(calls, 0);
});
test("modified prompt or runner hash is rejected by the same pin validator", () => {
  const p = "docs/bologna-paint-api-live.ts", real = pin(p); assert.throws(() => verifyPins({ [p]: { ...real, sha256: "0".repeat(64) } }));
  const pp = "data/bo-004s-paint/prompts/prompt.txt"; assert.throws(() => verifyPins({ [pp]: { ...pin(pp), sha256: "0".repeat(64) } }));
});
test("post-QA four-pixel drift trigger and identity controls are meaningful", async () => {
  const ref = new Float32Array(40 * 40), out = new Float32Array(40 * 40); ref[20 * 40 + 20] = 100; out[20 * 40 + 26] = 100;
  assert.equal(anchorDrift(ref, out, 40, 40, 20, 20).status, "INVESTIGATE_DRIFT");
  const anchors = JSON.parse(readFileSync(absolute("data/bo-004s-paint/candidate/selection.json"), "utf8")).anchors;
  const r = await postQaMetrics(original, readFileSync(absolute("data/bo-004s-paint/input/height.png")), original, anchors);
  assert.equal(r.anchors.length, 9); assert.equal(r.alphaMin, 255); assert.equal(r.automaticFidelityPass, false);
  assert(r.anchors.every(a => a.distancePx === 0 || a.status === "NOT_VERIFIED_NO_REFERENCE_EDGE"));
});
test("pure API preflight module graph has no HTTP, child process or live transport", async () => {
  const r = await build({ absWorkingDir: REPO, entryPoints: ["docs/bologna-paint-api-plan.ts"], bundle: true, write: false, metafile: true, packages: "external", platform: "node", format: "esm" });
  for (const [p, file] of Object.entries(r.metafile!.inputs)) { assert(!p.endsWith("api-live.ts") && !p.endsWith("api-https.ts") && !p.endsWith("api-attempt.ts")); for (const i of file.imports) assert(!/node:(https?|child_process)|openai/.test(i.path)); }
});
test("real transport source has one request call, private agent and no redirects/proxy/retry loops", () => {
  const s = readFileSync(absolute("docs/bologna-paint-api-https.ts"), "utf8"); assert.equal((s.match(/\brequest\(ENDPOINT/g) || []).length, 1);
  assert(s.includes("++calls !== 1") && s.includes("new Agent({ keepAlive: false")); assert(!/\b(?:fetch|setInterval)\(|\b(?:for|while)\s*\(/.test(s)); assert(s.includes("req.end(body)"));
});
test("canonical preflight revalidates four source images and all old pins without HTTP", { skip: !existsNoFollow(absolute(API_APPROVAL)) }, async () => {
  const p = await validateApiManifest(); assert.equal(p.imageChecks.length, 4); assert.equal(p.protectedFiles, 1410); assert.notEqual(p.hash, OLD_APPROVAL); assert.equal(p.m.endpoint, ENDPOINT);
  const body = JSON.parse(p.body.toString()); assert.equal(body.images.length, 4); assert.equal(body.n, 1);
  for (let i = 0; i < 4; i++) assert.equal(digest(Buffer.from(body.images[i].image_url.split(",")[1], "base64")), p.m.inputs[i].pin.sha256);
  const r = spawnSync(process.execPath, ["--permission", `--allow-fs-read=${REPO}`, "--allow-addons", "docs/bologna-paint-api-plan.ts", "--dry-run"], { cwd: REPO, encoding: "utf8", timeout: 60000 });
  assert.equal(r.status, 0, r.stderr); const report = JSON.parse(r.stdout); assert.equal(report.applicationRequestsMade, 0); assert.equal(report.writes, 0);
  assert(!existsNoFollow(absolute(API_ROOT + "/run-minus1-minus1"))); assert(!existsNoFollow(absolute(API_ROOT + "/attempt-ledger.jsonl")));
});
