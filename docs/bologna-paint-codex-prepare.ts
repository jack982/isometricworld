/** Gate 0/A only: copy frozen assets and inspect CLI help/auth/features, never start inference. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { absolute, inventory, pin, read, validatePreflight, verifyPins, type FilePin } from "./bologna-paint-support.ts";
import { chatgptAuthentication, chatgptEnvironment, redact } from "./bologna-paint-codex-process.ts";
import { invocationPrompt, NAMES, NATIVE_MANIFEST, NATIVE_ROOT, ORIGINAL_PROMPT, POLICY, present, regular, safePath, SOURCES, type NativeManifest } from "./bologna-paint-codex-core.ts";

assert.equal(process.argv.length, 2, "PREPARATION_NO_FLAGS");
assert(!present(absolute(NATIVE_ROOT)) && !present(absolute(NATIVE_MANIFEST)), "PRESERVE_EXISTING_NATIVE_ROOT_OR_MANIFEST"); safePath(absolute(NATIVE_ROOT));
const previous = await validatePreflight();
for (const name of ["docs/bologna-paint-checksums.json", "docs/bologna-paint-api-checksums.json"]) verifyPins(read<{ files: Record<string, FilePin> }>(name).files);
const priorFiles = inventory(["data/bo-004s-paint", "data/bo-004s-api-runner", ...readdirSync(absolute("docs")).filter(f => /^bologna-paint[.-]/.test(f) && !/^bologna-paint-codex[.-]/.test(f)).map(f => "docs/" + f)]);
const aliases = (process.env.PATH || "").split(":").filter(Boolean).map(p => join(p, "codex"));
const alias = aliases.find(p => { try { accessSync(p, constants.X_OK); return true; } catch { return false; } });
assert(alias, "CODEX_NOT_INSTALLED"); const executable = realpathSync(alias), env = chatgptEnvironment(process.env);
const diagnostics = (args: string[]) => {
  const r = spawnSync(executable, args, { env, encoding: "utf8", timeout: 15000, maxBuffer: 1000000 });
  assert.equal(r.status, 0, "CODEX_DIAGNOSTIC_FAILED_NO_INFERENCE"); return redact((r.stdout || "") + (r.stderr || ""));
};
const versionOutput = diagnostics(["--version"]), version = versionOutput.match(/codex-cli\s+[^\s]+/)?.[0]; assert(version);
const help = diagnostics(["exec", "--ignore-user-config", "--strict-config", "-c", 'forced_login_method="chatgpt"', "-c", 'model_provider="openai"', "--ephemeral", "--help"]);
for (const flag of ["--skip-git-repo-check", "--sandbox", "--image", "--ignore-user-config", "--ephemeral", "--json"]) assert(help.includes(flag), "UNSUPPORTED_CLI_FLAGS");
const auth = chatgptAuthentication({ file: executable }, absolute("."), env);
const features = diagnostics(["features", "list"]); assert(/^image_generation\s+stable\s+true$/m.test(features), "NATIVE_IMAGE_TOOL_UNAVAILABLE_STOP");
mkdirSync(absolute(NATIVE_ROOT), { mode: 0o700 }); mkdirSync(absolute(NATIVE_ROOT + "/work"), { mode: 0o700 }); mkdirSync(absolute(NATIVE_ROOT + "/inspection"));
const work = NATIVE_ROOT + "/work", inputImages = [];
for (const name of NAMES) {
  const original = "data/bo-004s-paint/input/" + name, staged = work + "/" + name, bytes = regular(absolute(original));
  writeFileSync(absolute(staged), bytes, { flag: "wx", mode: 0o600 }); assert.deepEqual(pin(original), pin(staged));
  const meta = await sharp(bytes).metadata(); assert.equal(meta.format, "png"); inputImages.push({ original, staged, pin: pin(staged), width: meta.width!, height: meta.height! });
}
const originalPrompt = regular(absolute(ORIGINAL_PROMPT));
writeFileSync(absolute(work + "/prompt.txt"), originalPrompt, { flag: "wx", mode: 0o600 });
writeFileSync(absolute(work + "/invocation-prompt.txt"), invocationPrompt(originalPrompt.toString()), { flag: "wx", mode: 0o600 });
writeFileSync(absolute(work + "/AGENTS.md"), `This is one isolated Bologna painting experiment, manually authorized by the operator.\nUse only the four attached images and supplied Bologna prompt. Generate one candidate and copy the unchanged final PNG to out.png in this directory. Do not edit input images or prompts. Do not read or write other repository data, execute another painter, call an SDK or external image provider, use API keys, publish, deploy, commit, retry or start another window. Stop on tool absence, quota or failure. Internal calls are not enforced by this instruction; the operator has been warned.\n`, { flag: "wx", mode: 0o600 });
for (const [name, value] of Object.entries({ version: versionOutput, help, features, auth: JSON.stringify(auth) + "\n" })) writeFileSync(absolute(`${NATIVE_ROOT}/inspection/${name}.txt`), value, { flag: "wx" });
const m: NativeManifest = {
  schema: "BO-004S-C/v1", status: "PENDING_MANUAL_OPERATOR_EXECUTION", baseCommit: "826e0d1", branch: "feature/bo-004S-C-codex-original-painter",
  root: NATIVE_ROOT, work, window: [-1, -1], policy: POLICY, oldManifest: pin("docs/bologna-paint-input-manifest.json"), priorFiles,
  staged: inventory([work, NATIVE_ROOT + "/inspection"]), sources: Object.fromEntries(SOURCES.map(p => [p, pin(p)])),
  cli: { executable, pin: pin(executable), version, authentication: "ChatGPT", imageGenerationAdvertised: true, inspectedAt: new Date().toISOString() }, inputImages,
  prompt: { original: pin(ORIGINAL_PROMPT), staged: pin(work + "/prompt.txt"), invocation: pin(work + "/invocation-prompt.txt"), adaptation: "Only output destination run/-1_-1/raw.png -> out.png; original prompt.txt retained byte-for-byte" },
  previousApprovals: [previous.hash, pin("docs/bologna-paint-api-approval.json").sha256],
};
const value = JSON.stringify(m, null, 2) + "\n";
writeFileSync(absolute(NATIVE_MANIFEST), value, { flag: "wx" }); writeFileSync(absolute(NATIVE_ROOT + "/approval.json"), value, { flag: "wx" });
console.log(JSON.stringify({ status: m.status, manifest: NATIVE_MANIFEST, pin: pin(NATIVE_MANIFEST), protectedFiles: previous.protectedFiles, previousSpikeFiles: Object.keys(priorFiles).length, liveExecProcesses: 0, auth, cli: m.cli }, null, 2));
