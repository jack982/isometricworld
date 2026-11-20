/** BO-004S negative safety tests. Fixtures only under /tmp; no image-generation client exists. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { build } from "esbuild";
import { REGIONS, CITIES } from "../pipeline/src/places.ts";
import {
  absolute, approvalCheck, BOLOGNA_PROMPT, CAP_BLOCKER, composeWindow, createFreshRoot,
  digest, EXPERIMENT, imageCheck, liveCommand, MANIFEST, noSymlinks, pin, read, REPO,
  SOURCE, validatePreflight, verifyPins, windowBox, WINDOW, type PaintManifest, type SourceManifest,
} from "./bologna-paint-support.ts";

const hash = "a".repeat(64), now = Date.parse("2026-11-20T12:00:00Z");
const args = (h = hash, end = "2026-11-20T13:00:00Z") => ["--window=-1,-1", "--max-calls=1", "--attempts=1", "--workers=1", `--approve=${h}`, `--expires=${end}`];

test("one exact window, cap and fresh approval are accepted as intent only", () => assert.equal(approvalCheck(args(), hash, now).window, "-1,-1"));
test("missing or mismatched approval cannot reach live execution", () => {
  assert.throws(() => approvalCheck(args("b".repeat(64)), hash, now), /approval hash/);
  assert.throws(() => approvalCheck(args().filter(a => !a.startsWith("--approve")), hash, now), /approval hash/);
});
test("expired or unbounded-future approval is rejected", () => {
  assert.throws(() => approvalCheck(args(hash, "2026-11-20T11:59:59Z"), hash, now), /expired/);
  assert.throws(() => approvalCheck(args(hash, "2026-11-22T12:00:00Z"), hash, now), /24h/);
});
test("more than one call, attempt or worker is rejected", () => {
  for (const key of ["max-calls", "attempts", "workers"]) assert.throws(() => approvalCheck(args().map(a => a.startsWith(`--${key}=`) ? `--${key}=2` : a), hash, now), /exactly one/);
});
test("unbounded selection, near, force, parts, backend and duplicate arguments are rejected", () => {
  for (const flag of ["--near=44,11", "--force", "--parts", "--backend=fal", "--window=0,0"]) assert.throws(() => approvalCheck([...args(), flag], hash, now), /Unsupported/);
  assert.throws(() => approvalCheck(args().filter(a => !a.startsWith("--window")), hash, now), /single window/);
});
test("global bounds include four real tiles and no intentional corner cell", () => {
  const m = read<SourceManifest>(SOURCE + "/manifest.json"), w = windowBox(...WINDOW, m.tiles);
  assert.deepEqual([w.x, w.y, w.width, w.height], [-896, -896, 1024, 1024]);
  assert.deepEqual(w.tiles, [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }]);
  assert.equal(w.coverage, 1);
});
test("outside, blank-corner and invalid windows stop before composition", () => {
  const tiles = read<SourceManifest>(SOURCE + "/manifest.json").tiles;
  for (const [i, j] of [[90, 90], [-2, -2], [NaN, 0], [.5, 0]]) assert.throws(() => windowBox(i, j, tiles));
});
test("fresh root guard refuses existing experiment and every other root", () => {
  assert(existsSync(absolute(EXPERIMENT)), "Run preparation before integration tests");
  assert.throws(() => createFreshRoot(), /already exists/);
  for (const p of ["data/derived", "data/bo-003f-landmarks", "data/bo-005p-viewer", "../tmp", "/tmp"]) assert.throws(() => createFreshRoot(p), /named BO-004S/);
  assert.throws(() => noSymlinks("../outside"), /escapes/);
});
test("hash mismatch and absent file fail closed without writing", () => {
  const p = SOURCE + "/manifest.json";
  assert.throws(() => verifyPins({ [p]: { ...pin(p), sha256: hash } }), /hash-mismatched/);
  assert.throws(() => verifyPins({ [SOURCE + "/render/999_999.png"]: { sha256: hash, bytes: 0 } }));
});
test("missing height stops before a color crop; invalid height dimensions stop cleanly", async () => {
  const root = mkdtempSync(join(tmpdir(), "bo-004s-height-")); mkdirSync(join(root, "height")); mkdirSync(join(root, "render"));
  const m = { ...read<SourceManifest>(SOURCE + "/manifest.json"), tiles: [{ x: 0, y: 0 }] };
  await assert.rejects(composeWindow(m, 0, 0, root));
  await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 70, g: 10, b: 0, alpha: 1 } } }).png().toFile(join(root, "height/0_0.png"));
  await assert.rejects(composeWindow(m, 0, 0, root), /65536/);
});
test("missing render stops instead of silently generating black success", async () => {
  const root = mkdtempSync(join(tmpdir(), "bo-004s-render-")); mkdirSync(join(root, "height")); mkdirSync(join(root, "render"));
  copyFileSync(absolute(SOURCE + "/height/-1_-1.png"), join(root, "height/0_0.png"));
  const m = { ...read<SourceManifest>(SOURCE + "/manifest.json"), tiles: [{ x: 0, y: 0 }] };
  await assert.rejects(composeWindow(m, 0, 0, root), /ENOENT/);
});
test("blank, transparent and wrong-sized guide images are rejected", async () => {
  const root = mkdtempSync(join(tmpdir(), "bo-004s-images-"));
  for (const alpha of [0, 1]) {
    const p = join(root, `blank-${alpha}.png`);
    await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 10, g: 30, b: 90, alpha } } }).png().toFile(p);
    await assert.rejects(imageCheck(p, 8), alpha ? /Blank/ : /Transparent/);
    await assert.rejects(imageCheck(p, 1024), /dimensions/);
  }
});
test("height conversion matches known packed heights and sqrt mapping", async () => {
  const root = mkdtempSync(join(tmpdir(), "bo-004s-packed-")); mkdirSync(join(root, "height")); mkdirSync(join(root, "render"));
  const raw = Buffer.alloc(256 * 256 * 4);
  for (let n = 0; n < 256 * 256; n++) { const cm = n < 256 * 128 ? 20000 : 26000; raw[n * 4] = cm >> 8; raw[n * 4 + 1] = cm & 255; raw[n * 4 + 3] = 255; }
  await sharp(raw, { raw: { width: 256, height: 256, channels: 4 } }).png().toFile(join(root, "height/0_0.png"));
  copyFileSync(absolute(SOURCE + "/render/-1_-1.png"), join(root, "render/0_0.png"));
  const m = { ...read<SourceManifest>(SOURCE + "/manifest.json"), tiles: [{ x: 0, y: 0 }] };
  const result = await composeWindow(m, 0, 0, root); assert.equal(result.groundM, 100);
  const px = await sharp(result.height).ensureAlpha().raw().toBuffer();
  assert.equal(px[(100 * 1024 + 100) * 4], 0); assert.equal(px[(900 * 1024 + 100) * 4], 255);
});
test("prompt is Bologna-scoped, preserves topology and makes no named-landmark reconstruction claim", () => {
  for (const s of ["Emilia-Romagna", "hypotheses", "courtyard void", "portico clearance", "clock faces", "No perspective", "exactly once", "Do not retry", "back-facing", "not a Bologna species survey"]) assert(BOLOGNA_PROMPT.includes(s), s);
  assert(!/San Petronio|Accursio|Bauhaus|solar heaters/.test(BOLOGNA_PROMPT));
});
test("preflight's complete module graph exposes no provider or process entry point", async () => {
  const result = await build({ absWorkingDir: REPO, entryPoints: ["docs/bologna-paint-plan.ts"], bundle: true, write: false, metafile: true, format: "esm", platform: "node", packages: "external" });
  for (const [p, info] of Object.entries(result.metafile!.inputs)) {
    for (const entry of info.imports) assert(!/child_process|codex|image.gen/.test(entry.path), `${p}: ${entry.path}`);
    const source = readFileSync(absolute(p), "utf8");
    // RegExp.exec is a local parser, not a process. Native dependencies such as sharp are trusted
    // installed packages; every repository source in the actual bundle is checked recursively.
    assert(!/\bfetch\s*\(|\bspawn(?:Sync)?\s*\(|(?<!\.)\bexec(?:File|Sync|FileSync)?\s*\(|tools\.|\bimport\s*\(|\beval\s*\(/.test(source), p);
  }
  assert("pipeline/src/camera.ts" in result.metafile!.inputs);
});
test("read-only preflight validates all preservation pins and does not mutate input files", async () => {
  const m = read<PaintManifest>(MANIFEST), before = digest(readFileSync(absolute(MANIFEST)));
  assert.deepEqual(m.configuration, { REGIONS, CITIES });
  const result = await validatePreflight();
  assert(result.protectedFiles >= 990); assert.equal(result.modelCalls, 0); assert.equal(result.writes, 0); assert.equal(result.liveReady, false);
  assert.equal(result.blocker, CAP_BLOCKER); assert.equal(pin(MANIFEST).sha256, before);
  assert.equal(verifyPins(m.inputs), 4);
});
test("preflight runs with Node filesystem writes and child-process execution forbidden", () => {
  // Node 24 strips these erasable TypeScript types directly; no tsx/esbuild subprocess required.
  const result = spawnSync(process.execPath, ["--permission", `--allow-fs-read=${REPO}`, "--allow-addons", "docs/bologna-paint-plan.ts", "--dry-run"], { cwd: REPO, encoding: "utf8", timeout: 60000 });
  assert.equal(result.status, 0, result.stderr);
  const q = JSON.parse(result.stdout); assert.equal(q.observedImageCalls, 0); assert.equal(q.writes, 0);
  assert.equal(q.liveReady, false); assert(!existsSync(absolute(EXPERIMENT + "/run")));
});
test("even hash-matched approval cannot bypass unverified native tool-call cap", () => {
  const end = new Date(Date.now() + 3600_000).toISOString(), h = pin(MANIFEST).sha256;
  const command = liveCommand(h, end); assert(command.includes("--window=-1,-1"));
  const result = spawnSync(process.execPath, ["--import", "tsx", "docs/bologna-paint-live.ts", ...args(h, end)], { cwd: REPO, encoding: "utf8", timeout: 60000 });
  assert.equal(result.status, 1); assert(result.stderr.includes("BLOCKED_NATIVE_IMAGE_CALL_CAP"), result.stderr);
  assert(!existsSync(absolute(EXPERIMENT + "/run")));
});
