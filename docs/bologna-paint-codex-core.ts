/** BO-004S-C non-generating validation. No process launcher, API client or credential read. */
import assert from "node:assert/strict";
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { absolute, digest, inventory, pin, read, REPO, validatePreflight, verifyPins, type FilePin } from "./bologna-paint-support.ts";

export const NATIVE_ROOT = "data/bo-004s-codex-native";
export const NATIVE_MANIFEST = "docs/bologna-paint-codex-approval.json";
export const NAMES = ["input.png", "height.png", "style.png", "trees.png"];
export const ORIGINAL_PROMPT = "data/bo-004s-paint/prompts/prompt.txt";
export const RISK_FLAG = "--acknowledge-internal-call-risk";
export const POLICY = { maximumOuterExecProcesses: 1, applicationRetries: 0, concurrency: 1, fallback: false, timeoutMs: 900000, logByteLimit: 16 * 1024 * 1024, internalImageCallCap: null } as const;
export const SOURCES = ["docs/bologna-paint-codex-core.ts", "docs/bologna-paint-codex-process.ts", "docs/bologna-paint-codex-live.ts", "docs/bologna-paint-codex-plan.ts"];
export interface NativeManifest {
  schema: "BO-004S-C/v1"; status: "PENDING_MANUAL_OPERATOR_EXECUTION"; baseCommit: string; branch: string;
  root: string; work: string; window: [-1, -1]; policy: typeof POLICY;
  oldManifest: FilePin; priorFiles: Record<string, FilePin>; staged: Record<string, FilePin>; sources: Record<string, FilePin>;
  cli: { executable: string; pin: FilePin; version: string; authentication: "ChatGPT"; imageGenerationAdvertised: true; inspectedAt: string };
  inputImages: { original: string; staged: string; pin: FilePin; width: number; height: number }[];
  prompt: { original: FilePin; staged: FilePin; invocation: FilePin; adaptation: string };
  previousApprovals: string[];
}
export function present(p: string) { try { return lstatSync(p); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; } }
export function safePath(p: string) {
  const path = resolve(p); assert(path === REPO || path.startsWith(REPO + "/"), "OUTSIDE_WORKSPACE");
  let at = REPO;
  for (const part of path.slice(REPO.length).split("/").filter(Boolean)) { at = join(at, part); assert(!present(at)?.isSymbolicLink(), "SYMLINK_PATH"); }
  return path;
}
export function regular(p: string) {
  safePath(p); const fd = openSync(p, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { assert(fstatSync(fd).isFile(), "NOT_REGULAR_FILE"); return readFileSync(fd); } finally { closeSync(fd); }
}
export function invocationPrompt(original: string) {
  assert.equal(original.split("run/-1_-1/raw.png").length, 2, "ORIGINAL_OUTPUT_DIRECTIVE_CHANGED");
  return original.replace("run/-1_-1/raw.png", "out.png"); // destination only; keep every painting constraint
}
export function execArgs(work: string) {
  return ["exec", "--skip-git-repo-check", "--ignore-user-config", "--strict-config", "--ephemeral", "--enable", "image_generation", "-c", 'forced_login_method="chatgpt"', "-c", 'model_provider="openai"', "-s", "workspace-write", "-C", work,
    "--json", "--color", "never", ...NAMES.flatMap(n => ["-i", n]), "-"];
}
export function validateWindow(window: unknown) { assert.deepEqual(window, [-1, -1], "ONLY_WINDOW_MINUS1_MINUS1"); }
export function operatorChoice(args: string[], hash: string, previous: string[]) {
  assert(args.includes("--execute"), "MANUAL_EXECUTION_FLAG_REQUIRED");
  assert(args.includes(RISK_FLAG), "INTERNAL_CALL_RISK_ACKNOWLEDGEMENT_REQUIRED");
  assert.equal(new Set(args).size, args.length, "DUPLICATE_FLAGS");
  const options = args.filter(a => a !== "--execute" && a !== RISK_FLAG);
  assert.equal(options.length, 2, "ONLY_WINDOW_AND_NEW_APPROVAL_ALLOWED");
  assert(options.includes("--window=-1,-1"), "ONLY_WINDOW_MINUS1_MINUS1");
  const approval = options.find(a => a.startsWith("--approve="))?.slice(10);
  assert(approval && !previous.includes(approval), "OLD_APPROVAL_IS_NOT_NATIVE_RISK_CONSENT");
  assert.equal(approval, hash, "NEW_APPROVAL_HASH_MISMATCH");
}
export const proposedCommand = (hash: string) => `node --import tsx docs/bologna-paint-codex-live.ts --execute --window=-1,-1 --approve=${hash} ${RISK_FLAG}`;
export function unusedOutputs(root: string, work: string) {
  for (const p of [root, work]) { safePath(p); assert(present(p)?.isDirectory(), "MISSING_PILOT_DIRECTORY"); }
  for (const p of [join(work, "out.png"), ...["raw.png", "attempt.jsonl", "result.json", "qa.json", "codex.stdout.log", "codex.stderr.log", "preservation-after.json"].map(n => join(root, n))]) {
    safePath(p); assert(!present(p), "PILOT_ALREADY_ATTEMPTED_OR_OUTPUT_EXISTS");
  }
}
export async function validateNative() {
  const prior = await validatePreflight();
  const data = regular(absolute(NATIVE_MANIFEST)), hash = digest(data), m = JSON.parse(data.toString()) as NativeManifest;
  assert.equal(m.schema, "BO-004S-C/v1"); assert.equal(m.status, "PENDING_MANUAL_OPERATOR_EXECUTION");
  assert.equal(m.root, NATIVE_ROOT); assert.equal(m.work, NATIVE_ROOT + "/work"); validateWindow(m.window); assert.deepEqual(m.policy, POLICY);
  assert.deepEqual(m.oldManifest, pin("docs/bologna-paint-input-manifest.json")); verifyPins(m.priorFiles);
  assert.deepEqual(Object.keys(m.sources).sort(), SOURCES.slice().sort()); verifyPins(m.sources); verifyPins(m.staged);
  assert.equal(m.inputImages.length, 4);
  for (let i = 0; i < 4; i++) {
    const img = m.inputImages[i], original = "data/bo-004s-paint/input/" + NAMES[i], stage = m.work + "/" + NAMES[i];
    assert.equal(img.original, original); assert.equal(img.staged, stage);
    assert.deepEqual(pin(original), prior.m.inputs[original]); assert.deepEqual(pin(stage), pin(original)); assert.deepEqual(img.pin, pin(stage));
    const meta = await sharp(regular(absolute(stage))).metadata();
    assert.equal(meta.format, "png"); assert.deepEqual([meta.width, meta.height], i === 2 ? [2048, 1024] : [1024, 1024]);
  }
  const original = regular(absolute(ORIGINAL_PROMPT));
  assert.equal(digest(regular(absolute(m.work + "/prompt.txt"))), digest(original));
  assert.equal(regular(absolute(m.work + "/invocation-prompt.txt")).toString(), invocationPrompt(original.toString()));
  assert.deepEqual(m.prompt.original, pin(ORIGINAL_PROMPT)); assert.deepEqual(m.prompt.staged, pin(m.work + "/prompt.txt")); assert.deepEqual(m.prompt.invocation, pin(m.work + "/invocation-prompt.txt"));
  // CLI executables commonly have trusted installation symlinks. Pin the resolved regular binary,
  // not a mutable PATH alias; staging/output paths above never permit links.
  assert.equal(realpathSync(m.cli.executable), m.cli.executable); assert(lstatSync(m.cli.executable).isFile());
  assert.deepEqual(pin(m.cli.executable), m.cli.pin, "CODEX_BINARY_CHANGED_REINSPECT");
  assert.equal(m.cli.authentication, "ChatGPT"); assert.equal(m.cli.imageGenerationAdvertised, true);
  unusedOutputs(absolute(m.root), absolute(m.work));
  const roots = prior.m.protectedRoots.filter(p => p.existed).map(p => p.path);
  assert.deepEqual(Object.keys(inventory(roots)).sort(), Object.keys(prior.m.preservation).filter(p => roots.some(r => p.startsWith(r + "/"))).sort());
  return { m, hash, protectedFiles: prior.protectedFiles, additionalPreservedFiles: Object.keys(m.priorFiles).length };
}
