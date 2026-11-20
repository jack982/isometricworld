/** One foreground outer CLI invocation. Tests supply a fake executable, never a risk flag. */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { constants, closeSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { digest, type FilePin } from "./bologna-paint-support.ts";
import { execArgs, POLICY } from "./bologna-paint-codex-core.ts";

export function chatgptEnvironment(env: NodeJS.ProcessEnv) {
  const clean = { ...env };
  for (const name of Object.keys(clean)) if (/^(OPENAI_|AZURE_|FAL_|GEMINI_|GOOGLE_API_KEY|ANTHROPIC_API_KEY|CODEX_API_KEY)/i.test(name)) delete clean[name];
  // Disable config inheritance and provider credentials without changing CODEX_HOME or the login.
  return clean;
}
export function redact(text: string) {
  return text.replace(/\bsk-[A-Za-z0-9_-]{8,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/((?:access_token|refresh_token|id_token|OPENAI_API_KEY|CODEX_API_KEY)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, "$1[REDACTED]");
}
export function quotaRejection(text: string) {
  // A token count or coordinate of 429 is not an HTTP rejection. Match explicit limits/statuses.
  return /usage limit|rate[ _-]?limit[ _-](?:reached|exceeded)|quota[ _-](?:reached|exceeded|exhausted)|too many requests/i.test(text)
    || /\bHTTP(?:\/[\d.]+)?\s+429\b|["']?(?:status|status_code|code)["']?\s*[:=]\s*["']?429\b|^\s*error[^\n]{0,160}\b429\b/im.test(text);
}
export interface Executable { file: string; prefix?: string[] }
export function chatgptAuthentication(exe: Executable, cwd: string, env: NodeJS.ProcessEnv) {
  // Inspect first without imposing a forced mode: a mismatched forced-login setting can log out
  // an existing account. Restrict the later exec only after this read-only check says ChatGPT.
  const r = spawnSync(exe.file, [...(exe.prefix || []), "login", "status"], { cwd, env: chatgptEnvironment(env), encoding: "utf8", timeout: 15000, maxBuffer: 65536 });
  assert(r.status === 0 && /^Logged in using ChatGPT\s*$/m.test((r.stdout || "") + (r.stderr || "")), "CHATGPT_LOGIN_NOT_VERIFIED_NO_EXEC");
  return { route: "ChatGPT" as const, verifiedAt: new Date().toISOString() };
}

async function imageQa(input: string, raw: Buffer) {
  const meta = await sharp(raw).metadata(); assert.equal(meta.format, "png", "CORRUPT_OR_NON_PNG");
  assert.deepEqual([meta.width, meta.height], [1024, 1024], "WRONG_OUTPUT_DIMENSIONS");
  const rgba = await sharp(raw).ensureAlpha().raw().toBuffer();
  for (let k = 3; k < rgba.length; k += 4) assert.equal(rgba[k], 255, "ALPHA_HOLE");
  assert((await sharp(raw).stats()).channels.slice(0, 3).some(s => s.stdev >= 1), "BLANK_OUTPUT");
  const grid = await sharp(raw).removeAlpha().resize(8, 8).raw().toBuffer();
  const darkCells = Array.from({ length: 64 }, (_, k) => (grid[k * 3] + grid[k * 3 + 1] + grid[k * 3 + 2]) / 3).filter(v => v < 15).length;
  assert.equal(darkCells, 0, "DARK_BAND_OR_PATCH");
  // Read-only identity edge correlation; no registration, warp, repaint or aesthetic judgement.
  const edges = async (b: string | Buffer) => {
    const gray = await sharp(b).removeAlpha().resize(256, 256).greyscale().blur(.8).raw().toBuffer(), out: number[] = [];
    for (let y = 12; y < 244; y += 2) for (let x = 12; x < 244; x += 2) {
      const k = y * 256 + x;
      const dx = gray[k + 1 - 256] + 2 * gray[k + 1] + gray[k + 1 + 256] - gray[k - 1 - 256] - 2 * gray[k - 1] - gray[k - 1 + 256];
      const dy = gray[k + 256 - 1] + 2 * gray[k + 256] + gray[k + 256 + 1] - gray[k - 256 - 1] - 2 * gray[k - 256] - gray[k - 256 + 1]; out.push(Math.hypot(dx, dy));
    } return out;
  };
  const a = await edges(input), b = await edges(raw), mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length, ma = mean(a), mb = mean(b);
  let cov = 0, va = 0, vb = 0;
  for (let k = 0; k < a.length; k++) { cov += (a[k] - ma) * (b[k] - mb); va += (a[k] - ma) ** 2; vb += (b[k] - mb) ** 2; }
  const identityEdgeCorrelation = cov / Math.sqrt(va * vb + 1e-9);
  return { format: meta.format, width: meta.width, height: meta.height, alphaMin: 255, darkCells, identityEdgeCorrelation, minMatchHeuristic: .45, passed: identityEdgeCorrelation >= .45, architecturalFidelity: "NOT_VERIFIED", independentHumanAcceptance: "NOT_TESTED", registrationApplied: false };
}
export interface Pilot {
  root: string; work: string; approvalHash: string; stagedPins: Record<string, FilePin>; prompt: string;
  executable: Executable; env: NodeJS.ProcessEnv; timeoutMs?: number;
}
function checkPins(pins: Record<string, FilePin>) {
  for (const [path, expected] of Object.entries(pins)) { assert(!lstatSync(path).isSymbolicLink(), "STAGED_SYMLINK"); const b = readFileSync(path); assert.deepEqual({ bytes: b.length, sha256: digest(b) }, expected, "STAGED_HASH_CHANGED"); }
}
export async function oneOuterInvocation(p: Pilot) {
  checkPins(p.stagedPins); // no process, ledger or image when staging changed
  for (const file of [join(p.work, "out.png"), ...["raw.png", "attempt.jsonl", "result.json", "qa.json", "codex.stdout.log", "codex.stderr.log"].map(n => join(p.root, n))]) {
    try { lstatSync(file); throw new Error("PILOT_ALREADY_ATTEMPTED_OR_OUTPUT_EXISTS"); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  }
  const env = chatgptEnvironment(p.env), auth = chatgptAuthentication(p.executable, p.work, env);
  const ledger = openSync(join(p.root, "attempt.jsonl"), constants.O_CREAT | constants.O_EXCL | constants.O_APPEND | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  const event = (v: unknown) => { writeSync(ledger, JSON.stringify(v) + "\n"); fsyncSync(ledger); };
  const startedAt = new Date().toISOString(); event({ event: "OUTER_EXEC_ATTEMPT_STARTED", startedAt, approvalHash: p.approvalHash });
  const dir = openSync(p.root, constants.O_RDONLY | constants.O_DIRECTORY); try { fsyncSync(dir); } finally { closeSync(dir); }
  const out: Buffer[] = [], err: Buffer[] = []; let bytes = 0, reason: string | null = null, spawned = false, code: number | null = null, signal: string | null = null;
  try {
    await new Promise<void>(resolve => {
      const child = spawn(p.executable.file, [...(p.executable.prefix || []), ...execArgs(p.work)], { cwd: p.work, env, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      const kill = (why: string) => {
        if (reason) return; reason = why;
        const stop = (sig: NodeJS.Signals) => { try { if (process.platform !== "win32" && child.pid) process.kill(-child.pid, sig); else child.kill(sig); } catch {} };
        stop("SIGTERM"); killTimer = setTimeout(() => stop("SIGKILL"), 2000);
      };
      const timer = setTimeout(() => kill("TIMEOUT_NO_RETRY"), p.timeoutMs ?? POLICY.timeoutMs);
      const collect = (target: Buffer[], b: Buffer) => {
        bytes += b.length;
        if (bytes <= POLICY.logByteLimit) target.push(Buffer.from(b)); else kill("LOG_LIMIT_NO_RETRY");
        const tail = Buffer.concat(target).toString().slice(-12000);
        if (quotaRejection(tail)) kill("QUOTA_OR_RATE_LIMIT_NO_RETRY");
      };
      child.on("spawn", () => { spawned = true; });
      child.stdout.on("data", b => collect(out, b)); child.stderr.on("data", b => collect(err, b));
      child.on("error", () => { reason ||= "SPAWN_FAILED_NO_RETRY"; });
      child.stdin.on("error", () => {}); child.stdin.end(p.prompt);
      child.on("close", (status, sig) => { code = status; signal = sig; clearTimeout(timer); if (killTimer) clearTimeout(killTimer); resolve(); });
    });
    writeFileSync(join(p.root, "codex.stdout.log"), redact(Buffer.concat(out).toString()), { flag: "wx", mode: 0o600 });
    writeFileSync(join(p.root, "codex.stderr.log"), redact(Buffer.concat(err).toString()), { flag: "wx", mode: 0o600 });
    const result: Record<string, unknown> = { status: "FAILED_NO_RETRY", auth, startedAt, finishedAt: new Date().toISOString(), approvalHash: p.approvalHash, outerExecSpawnAttempts: 1, outerExecProcesses: spawned ? 1 : 0, exitCode: code, signal, stopReason: reason, policy: POLICY, internalImageToolCalls: "UNKNOWN_NOT_HARD_CAPPED", allowanceChange: "NOT_OBSERVED", usdCost: "UNKNOWN_NOT_INFERRED", registrationApplied: false, logsRedacted: true };
    const file = join(p.work, "out.png");
    let qa: unknown = null;
    try {
      const st = lstatSync(file); assert(st.isFile() && !st.isSymbolicLink(), "UNSAFE_OUTPUT");
      const raw = readFileSync(file); writeFileSync(join(p.root, "raw.png"), raw, { flag: "wx", mode: 0o600 }); // exact returned bytes, including failed results
      result.rawSha256 = digest(raw); result.rawBytes = raw.length;
      checkPins(p.stagedPins);
      qa = await imageQa(join(p.work, "input.png"), raw);
      assert((qa as { passed: boolean }).passed, "LOW_EDGE_CORRELATION_NO_RETRY");
      if (!reason && code === 0) result.status = "RAW_CANDIDATE_SAVED_PENDING_HUMAN";
    } catch (e) { result.qaFailure = redact((e as Error).message.replace(/\n[\s\S]*/, "")).slice(0, 160); }
    if (!qa) qa = { status: "FAILED_OR_MISSING_OUTPUT", independentHumanAcceptance: "NOT_TESTED" };
    writeFileSync(join(p.root, "qa.json"), JSON.stringify(qa, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    writeFileSync(join(p.root, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    event({ event: "OUTER_EXEC_ATTEMPT_FINISHED", status: result.status, outerExecProcesses: result.outerExecProcesses });
    return result;
  } finally { closeSync(ledger); }
}
