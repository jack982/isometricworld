/** Gate A offline mocks. Never pass the live risk flag or start the installed Codex executable. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import { absolute, digest, pin, REPO } from "./bologna-paint-support.ts";
import { execArgs, invocationPrompt, NAMES, NATIVE_MANIFEST, operatorChoice, POLICY, present, proposedCommand, validateNative, validateWindow } from "./bologna-paint-codex-core.ts";
import { chatgptEnvironment, oneOuterInvocation, quotaRejection, redact, type Pilot } from "./bologna-paint-codex-process.ts";

const mockProgram = `
import {appendFileSync,copyFileSync,writeFileSync} from 'node:fs';
const a=process.argv.slice(2),mode=process.env.MOCK_MODE;
if(a.includes('login')){console.log(mode==='missing-auth'?'Not logged in':mode==='api-auth'?'Logged in using API key':'Logged in using ChatGPT');process.exit(mode==='missing-auth'?1:0);}
if(a[0]!=='exec')process.exit(9);
appendFileSync(process.env.MOCK_TRACE,JSON.stringify({argv:a,openai:!!process.env.OPENAI_API_KEY,codexKey:!!process.env.CODEX_API_KEY,fal:!!process.env.FAL_KEY})+'\\n');
let prompt='';for await (const c of process.stdin)prompt+=c;
appendFileSync(process.env.MOCK_TRACE,JSON.stringify({prompt})+'\\n');
if(mode==='timeout'){setInterval(()=>{},1000);}
else if(mode==='quota'){console.error('usage limit reached; try again tomorrow');setInterval(()=>{},1000);}
else if(mode==='missing'){process.exit(0);}
else if(mode==='corrupt'){writeFileSync('out.png','not-a-PNG');process.exit(0);}
else {copyFileSync('input.png','out.png');console.log('Bearer hidden-secret-value');console.error('sk-test-abcdefghijklmnop');process.exit(mode==='nonzero'?7:0);}
`;
function fixture(mode: string): Pilot {
  const root = mkdtempSync(join(tmpdir(), "bo004sc-mock-")), work = join(root, "work"); mkdirSync(work);
  const stagedPins: Pilot["stagedPins"] = {};
  for (const name of NAMES) { const to = join(work, name); copyFileSync(absolute("data/bo-004s-paint/input/" + name), to); const b = readFileSync(to); stagedPins[to] = { bytes: b.length, sha256: digest(b) }; }
  const cli = join(root, "mock-codex.mjs"); writeFileSync(cli, mockProgram);
  return { root, work, approvalHash: "a".repeat(64), stagedPins, executable: { file: process.execPath, prefix: [cli] }, env: { ...process.env, MOCK_MODE: mode, MOCK_TRACE: join(root, "calls.jsonl"), OPENAI_API_KEY: "fake-secret-do-not-forward", CODEX_API_KEY: "fake-secret-do-not-forward", FAL_KEY: "fake-secret-do-not-forward" }, prompt: invocationPrompt(readFileSync(absolute("data/bo-004s-paint/prompts/prompt.txt"), "utf8")), timeoutMs: mode === "timeout" ? 1000 : 10000 };
}
function calls(p: Pilot) { const path = join(p.root, "calls.jsonl"); return present(path) ? readFileSync(path, "utf8").trim().split("\n").map(s => JSON.parse(s)) : []; }

test("original four-image CLI workflow, stdin and isolated workspace are retained", () => {
  const a = execArgs("/example/work"); assert.equal(a[0], "exec"); assert.equal(a.at(-1), "-");
  assert.equal(a[a.indexOf("-s") + 1], "workspace-write"); assert.equal(a[a.indexOf("-C") + 1], "/example/work");
  assert.deepEqual(a.flatMap((v, i) => v === "-i" ? [a[i + 1]] : []), NAMES);
  assert(a.includes('forced_login_method="chatgpt"') && a.includes('model_provider="openai"') && a.includes("--ignore-user-config"));
  assert.equal(POLICY.maximumOuterExecProcesses, 1); assert.equal(POLICY.internalImageCallCap, null); assert.equal(POLICY.applicationRetries, 0);
});
test("invocation prompt changes only the output destination and retains original prohibitions", () => {
  const original = readFileSync(absolute("data/bo-004s-paint/prompts/prompt.txt"), "utf8"), prompt = invocationPrompt(original);
  assert.equal(prompt.replace("out.png", "run/-1_-1/raw.png"), original);
  for (const s of ["courtyard void", "portico clearance", "clock faces", "coastline", "palms", "back-facing"]) assert(prompt.includes(s));
});
test("no execution without the new deliberate acknowledgement; tests never supply it", () => {
  assert.throws(() => operatorChoice([], "a".repeat(64), []), /MANUAL_EXECUTION_FLAG/);
  assert.throws(() => operatorChoice(["--execute", "--window=-1,-1", "--approve=" + "a".repeat(64)], "a".repeat(64), []), /ACKNOWLEDGEMENT/);
  assert(proposedCommand("a".repeat(64)).includes("--acknowledge-internal-call-risk")); // inspect text only
});
test("alternate windows fail, including noninteger and unbounded coordinates", () => {
  validateWindow([-1, -1]); for (const w of [[0, 0], [-1, 0], [NaN, -1], [-1.5, -1], []]) assert.throws(() => validateWindow(w), /ONLY_WINDOW/);
});
test("API credentials are removed from child environment without changing caller or CODEX_HOME", () => {
  const e = { OPENAI_API_KEY: "secret", CODEX_API_KEY: "secret", FAL_KEY: "secret", CODEX_HOME: "/unchanged", PATH: process.env.PATH };
  const c = chatgptEnvironment(e); assert(!c.OPENAI_API_KEY && !c.CODEX_API_KEY && !c.FAL_KEY); assert.equal(c.CODEX_HOME, e.CODEX_HOME); assert.equal(e.OPENAI_API_KEY, "secret");
});
test("credential redaction handles keys, bearer strings, token fields and JWTs", () => {
  const raw = 'sk-test-abcdefghijklmnop Bearer hidden-secret-value access_token="private-token" eyJhbGciOiJ0ZXN0In0.eyJ0ZXN0IjoxfQ.signature';
  const r = redact(raw); for (const s of ["abcdefghijklmnop", "hidden-secret-value", "private-token", "eyJhbG"]) assert(!r.includes(s));
});
test("quota stop recognises actual rejection, not an ordinary 429 token count", () => {
  for (const text of ["usage limit reached", "HTTP 429", '{"status":429}', "rate_limit_exceeded", "quota exhausted"]) assert(quotaRejection(text));
  for (const text of ['{"status":"completed","usage":{"total_tokens":429}}', "location 429,128", "Stop on quota, rate limit, tool absence or error."]) assert(!quotaRejection(text));
});
test("mock CLI spawns once, receives exactly four inputs and preserves the raw candidate", async () => {
  const p = fixture("success"), r = await oneOuterInvocation(p), c = calls(p);
  assert.equal(r.outerExecProcesses, 1); assert.equal(c.filter(v => v.argv).length, 1); assert.equal(r.status, "RAW_CANDIDATE_SAVED_PENDING_HUMAN");
  assert.equal(c.find(v => v.prompt).prompt, p.prompt); assert.equal(c[0].openai, false); assert.equal(c[0].codexKey, false); assert.equal(c[0].fal, false);
  assert.equal(digest(readFileSync(join(p.root, "raw.png"))), digest(readFileSync(join(p.work, "out.png"))));
  const qa = JSON.parse(readFileSync(join(p.root, "qa.json"), "utf8")); assert(qa.identityEdgeCorrelation > .99); assert.equal(qa.independentHumanAcceptance, "NOT_TESTED");
  assert(!readFileSync(join(p.root, "codex.stdout.log"), "utf8").includes("hidden-secret-value")); assert(!readFileSync(join(p.root, "codex.stderr.log"), "utf8").includes("abcdefghijklmnop"));
});
for (const mode of ["nonzero", "missing", "corrupt", "timeout", "quota"]) test(`mock ${mode} stops after one outer invocation with no retry`, async () => {
  const p = fixture(mode), r = await oneOuterInvocation(p); assert.equal(r.status, "FAILED_NO_RETRY"); assert.equal(r.outerExecProcesses, 1); assert.equal(calls(p).filter(v => v.argv).length, 1);
  if (mode === "nonzero" || mode === "corrupt") assert(present(join(p.root, "raw.png")), "Raw failed candidate must survive");
  if (mode === "timeout") assert.equal(r.stopReason, "TIMEOUT_NO_RETRY");
  if (mode === "quota") assert.equal(r.stopReason, "QUOTA_OR_RATE_LIMIT_NO_RETRY");
  await assert.rejects(oneOuterInvocation(p), /ALREADY_ATTEMPTED|OUTPUT_EXISTS/); assert.equal(calls(p).filter(v => v.argv).length, 1);
});
test("hash mismatch prevents any CLI process, including auth inspection", async () => {
  const p = fixture("success"); writeFileSync(join(p.work, "input.png"), "changed"); await assert.rejects(oneOuterInvocation(p), /HASH_CHANGED/); assert.equal(calls(p).length, 0); assert(!present(join(p.root, "attempt.jsonl")));
});
for (const mode of ["missing-auth", "api-auth"]) test(`mock ${mode} refuses without outer exec or ledger`, async () => {
  const p = fixture(mode); await assert.rejects(oneOuterInvocation(p), /CHATGPT_LOGIN_NOT_VERIFIED/); assert.equal(calls(p).length, 0); assert(!present(join(p.root, "attempt.jsonl")));
});
test("existing output refuses overwrite before auth or generation", async () => {
  const p = fixture("success"); writeFileSync(join(p.root, "raw.png"), "existing"); await assert.rejects(oneOuterInvocation(p), /OUTPUT_EXISTS/); assert.equal(readFileSync(join(p.root, "raw.png"), "utf8"), "existing"); assert.equal(calls(p).length, 0);
});
test("pure dry-run module graph has no process or API client dependency", async () => {
  const r = await build({ absWorkingDir: REPO, entryPoints: ["docs/bologna-paint-codex-plan.ts"], bundle: true, write: false, metafile: true, platform: "node", format: "esm", packages: "external" });
  for (const [path, v] of Object.entries(r.metafile!.inputs)) { assert(!/codex-(?:process|live)\.ts|paint-api/.test(path)); for (const i of v.imports) assert(!/node:(?:https?|child_process)|openai/.test(i.path)); }
});
test("new manifest and staged references validate; dry-run cannot start Codex", { skip: !present(absolute(NATIVE_MANIFEST)) }, async () => {
  const p = await validateNative(); assert.equal(p.protectedFiles, 1410); assert(!p.m.previousApprovals.includes(p.hash));
  const r = spawnSync(process.execPath, ["--permission", `--allow-fs-read=${REPO}`, `--allow-fs-read=${p.m.cli.executable}`, "--allow-addons", "docs/bologna-paint-codex-plan.ts", "--dry-run"], { cwd: REPO, encoding: "utf8", timeout: 60000 });
  assert.equal(r.status, 0, r.stderr); const d = JSON.parse(r.stdout); assert.equal(d.realOuterExecProcesses, 0); assert.equal(d.writes, 0); assert.equal(d.policy.internalImageCallCap, null);
});
