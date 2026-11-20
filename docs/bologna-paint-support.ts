/** BO-004S preparation primitives. No provider, subprocess, network or generation dependency. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { camera, axes, enuToLlh, useRegion } from "../pipeline/src/camera.ts";
import { readHeights, seaH } from "../pipeline/src/heights.ts";
import { REGIONS, CITIES } from "../pipeline/src/places.ts";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const EXPERIMENT = "data/bo-004s-paint";
export const SOURCE = "data/bo-003f-landmarks/derived/piazza-maggiore";
export const MANIFEST = "docs/bologna-paint-input-manifest.json";
export const WIN = 1024, STRIDE = 896, OVERLAP = 128;
export const WINDOW: [number, number] = [-1, -1];
export const CAP_BLOCKER = "BLOCKED_NATIVE_IMAGE_CALL_CAP: codex exec has no verified enforceable native image-tool call budget; a process cap or prompt is insufficient";
export interface FilePin { sha256: string; bytes: number }
export interface Tile { x: number; y: number }
export interface SourceManifest { camera: ReturnType<typeof camera>; bbox: number[]; tiles: Tile[]; attributions: string[] }
export interface PaintManifest {
  status: "PENDING_LIVE_APPROVAL"; baseCommit: string; branch: string; createdAt: string;
  root: string; source: string; area: string; camera: ReturnType<typeof camera>; bbox: number[]; geoidM: number;
  window: { i: number; j: number; x: number; y: number; width: number; height: number; tiles: Tile[]; coverage: number; approximateCenter: number[] };
  inputs: Record<string, FilePin>; artifacts: Record<string, FilePin>; preservation: Record<string, FilePin>;
  protectedRoots: { path: string; existed: boolean }[];
  configuration: { REGIONS: typeof REGIONS; CITIES: typeof CITIES };
  heightConversion: { groundM: number; formula: string; kernel: string; groundSamples: number };
  backend: { name: string; cliVersion: string; imageFeature: boolean; authentication: string; model: string; nativeCallCapVerified: false; blocker: string };
  policy: { imageCalls: 1; retries: 0; workers: 1; outputs: 1; maxApprovalAgeHours: 24 };
  licences: unknown[]; candidate: unknown; historicalChecks: unknown;
}
export const absolute = (p: string) => resolve(REPO, p);
export const read = <T = unknown>(p: string): T => JSON.parse(readFileSync(absolute(p), "utf8"));
export const digest = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
export const pin = (p: string): FilePin => { const b = readFileSync(absolute(p)); return { sha256: digest(b), bytes: b.length }; };

/** Reject links in every existing component, including links pointing back into the repository. */
export function noSymlinks(p: string) {
  const path = absolute(p);
  assert(path === REPO || path.startsWith(REPO + "/"), "Path escapes repository");
  let at = REPO;
  for (const part of relative(REPO, path).split("/").filter(Boolean)) {
    at = join(at, part);
    if (existsSync(at)) assert(!lstatSync(at).isSymbolicLink(), `Symlink forbidden: ${at}`);
  }
  return path;
}
export function createFreshRoot(path = EXPERIMENT) {
  assert.equal(path, EXPERIMENT, "Only the named BO-004S experiment root is permitted");
  const dest = noSymlinks(path);
  assert(!existsSync(dest), "Experiment root already exists; preserve it, refuse overwrite");
  mkdirSync(dest); // atomic non-recursive fail-if-exists, no copying links
  assert.equal(realpathSync(dest), dest);
}
export function inventory(paths: string[]) {
  const files: Record<string, FilePin> = {};
  function visit(p: string) {
    const path = noSymlinks(p), s = lstatSync(path);
    if (s.isDirectory()) for (const f of readdirSync(path).sort()) visit(p + "/" + f);
    else { assert(s.isFile(), `Not a regular file: ${p}`); files[p] = pin(p); }
  }
  for (const p of paths) if (existsSync(absolute(p))) visit(p);
  return files;
}
export function verifyPins(files: Record<string, FilePin>) {
  for (const [p, expected] of Object.entries(files)) {
    noSymlinks(p);
    assert.deepEqual(pin(p), expected, `Missing or hash-mismatched input: ${p}`);
  }
  return Object.keys(files).length;
}

export function windowBox(i: number, j: number, tiles: Tile[]) {
  assert(Number.isSafeInteger(i) && Number.isSafeInteger(j) && Math.abs(i) < 10000 && Math.abs(j) < 10000, "Invalid window coordinate");
  assert.equal(new Set(tiles.map(t => `${t.x}_${t.y}`)).size, tiles.length, "Duplicate tile");
  const x = i * STRIDE, y = j * STRIDE;
  const intersects = tiles.filter(t => t.x * WIN < x + WIN && (t.x + 1) * WIN > x && t.y * WIN < y + WIN && (t.y + 1) * WIN > y);
  const pixels = intersects.reduce((n, t) => n + Math.max(0, Math.min(x + WIN, (t.x + 1) * WIN) - Math.max(x, t.x * WIN)) * Math.max(0, Math.min(y + WIN, (t.y + 1) * WIN) - Math.max(y, t.y * WIN)), 0);
  assert.equal(pixels, WIN * WIN, "Window is outside manifest or has missing/blank source cells");
  return { i, j, x, y, width: WIN, height: WIN, tiles: intersects, coverage: pixels / (WIN * WIN) };
}
export async function imageCheck(path: string, size?: number) {
  const img = sharp(absolute(path)), meta = await img.metadata();
  assert.equal(meta.format, "png", `Not PNG: ${path}`);
  if (size) assert.deepEqual([meta.width, meta.height], [size, size], `Invalid image dimensions: ${path}`);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  let minimumAlpha = 255;
  for (let n = 3; n < data.length; n += 4) minimumAlpha = Math.min(minimumAlpha, data[n]);
  assert.equal(minimumAlpha, 255, `Transparent/invalid image: ${path}`);
  const stats = await sharp(absolute(path)).stats();
  assert(stats.channels.slice(0, 3).some(s => s.stdev >= 1), `Blank image: ${path}`);
  return { width: info.width, height: info.height, minimumAlpha, channelStdev: stats.channels.slice(0, 3).map(s => s.stdev) };
}
export async function sourceAudit() {
  const prior = read<{ files: Record<string, FilePin>; bbox: number[]; configuration: PaintManifest["configuration"] }>("docs/bologna-viewer-inputs.json");
  verifyPins(prior.files);
  assert.deepEqual({ REGIONS, CITIES }, prior.configuration);
  // areas.ts imports outline.ts's subprocess machinery. Its immutable source hash is already
  // pinned above; use the frozen bbox and pure camera API instead of importing that CLI dependency.
  useRegion("bologna"); const m = read<SourceManifest>(SOURCE + "/manifest.json");
  assert.deepEqual(m.camera, camera()); assert.deepEqual(m.bbox, prior.bbox);
  assert.equal(REGIONS.bologna.geoidM, 39.647); assert.equal(m.tiles.length, 10);
  for (const s of ["OpenStreetMap", "Comune di Bologna – SIT", "Settore Ambiente e Verde", "COPERNICUS", "BO-003F appearance references"]) assert(m.attributions.some(a => a.includes(s)), `Missing credit: ${s}`);
  const tileChecks = [];
  for (const t of m.tiles) {
    const c = `${SOURCE}/render/${t.x}_${t.y}.png`, h = `${SOURCE}/height/${t.x}_${t.y}.png`;
    const color = await imageCheck(c, 1024), height = await imageCheck(h, 256);
    const hs = await readHeights(absolute(h));
    assert(hs.every(Number.isFinite), `Invalid decoded height: ${h}`);
    tileChecks.push({ ...t, color: { ...pin(c), ...color }, height: { ...pin(h), ...height, minimumM: Math.min(...hs), maximumM: Math.max(...hs) } });
  }
  return { manifest: m, tileChecks, historicalFiles: Object.keys(prior.files).length };
}

/** Exact local paint.ts decoder/5th-percentile/sqrt mapping, without its permissive missing-tile fill. */
export async function composeWindow(m: SourceManifest, i: number, j: number, source = SOURCE) {
  useRegion("bologna");
  const box = windowBox(i, j, m.tiles), all: number[] = [], decoded = new Map<string, Float32Array>();
  for (const t of box.tiles) {
    const h = await readHeights(absolute(`${source}/height/${t.x}_${t.y}.png`));
    assert.equal(h.length, 256 * 256); assert(h.every(Number.isFinite), "Invalid source height");
    decoded.set(`${t.x}_${t.y}`, h);
    for (const v of h) if (v > seaH() - 0.5) all.push(v);
  }
  assert(all.length > 0, "No finite above-sea height samples");
  all.sort((a, b) => a - b); const groundM = all[Math.floor(all.length * 0.05)];
  async function crop(height: boolean) {
    const comps: OverlayOptions[] = [];
    for (const t of box.tiles) {
      let buf: Buffer;
      if (height) {
        const h = decoded.get(`${t.x}_${t.y}`)!, g = Buffer.alloc(h.length);
        for (let k = 0; k < h.length; k++) g[k] = Math.max(0, Math.min(255, Math.sqrt(Math.max(0, h[k] - groundM) / 60) * 255));
        buf = await sharp(g, { raw: { width: 256, height: 256, channels: 1 } }).resize(WIN, WIN, { kernel: "cubic" }).png().toBuffer();
      } else buf = readFileSync(absolute(`${source}/render/${t.x}_${t.y}.png`));
      const left = t.x * WIN - box.x, top = t.y * WIN - box.y;
      const sx = Math.max(0, -left), sy = Math.max(0, -top);
      comps.push({ input: await sharp(buf).extract({ left: sx, top: sy, width: Math.min(WIN - sx, WIN - Math.max(0, left)), height: Math.min(WIN - sy, WIN - Math.max(0, top)) }).png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) });
    }
    return sharp({ create: { width: WIN, height: WIN, channels: 4, background: "black" } }).composite(comps).png().toBuffer();
  }
  const { right, up } = axes(), cx = (box.x + WIN / 2) * .25, cy = -(box.y + WIN / 2) * .25;
  const u = groundM; // approximate tangent-plane intersection, not survey control
  const a = (cy - u * up[2]) / Math.sin(Math.PI / 4);
  const f = [-right[1], right[0]];
  const approximateCenter = enuToLlh([right[0] * cx + f[0] * a, right[1] * cx + f[1] * a, u]);
  return { box: { ...box, approximateCenter }, input: await crop(false), height: await crop(true), groundM, groundSamples: all.length };
}

/** Bologna-only visual hypotheses: never installed into the normal multi-region painter. */
export const BOLOGNA_PROMPT = `Use the built-in image generation tool exactly once, requesting exactly one 1024x1024 image. Do not retry, request variations or use a fallback provider. Stop on quota, rate limit, tool absence or error. Four images are attached in this order:
1. input.png: unchanged normal procedural render of the Emilia-Romagna historic urban centre, Italy; orthographic camera, 45 degrees down, heading 315 degrees, 0.25 metres per art pixel (256 m screen width).
2. height.png: the SAME camera, pixel-aligned 1024x1024 structure guide; sqrt grayscale above a local low-percentile ground estimate. Brighter indicates higher surfaces; dark areas can be ground or low relief, not a licence to fill them. This guide is interpolated from a 256px packed height pass, not a cadastral footprint mask.
3. style.png: the project's illustrated house style, for stroke, clarity, shading and detail density only.
4. trees.png: the project's central-European tree style sheet. Use generic rounded green deciduous crowns only at the input's existing tree locations. This is not a Bologna species survey; ignore the pink bloom and conifer examples unless the render actually supports them. No palms or new trees.

Illustrate image 1 in the visual family of image 3: crisp isometric surfaces, restrained detail, straight edges, soft even daylight and light ambient occlusion. Regional palette hypotheses are restrained ochre/brick/terracotta roofs, warm plaster and stone walls, pale grey/cream stone paving. Materials are visual hypotheses, not verified properties of every building. Keep the existing roof topology, including flat roofs; do not apply the reference's flat-roof architecture to every block. Window treatment and material shading must stay within existing faces and shapes; no new structural relief or rows of invented projecting balconies.

GEOMETRY AND TOPOLOGY COME ONLY FROM INPUT.PNG AND HEIGHT.PNG:
- Overlay image 1 pixel-for-pixel. Preserve its orthographic camera, position, framing, scale, crop and roof/wall boundaries. No perspective, rotation, zoom, rescaling, padding or new border.
- Preserve every road, corner, building volume and height, roof plane, open piazza, courtyard void, tree location and visible portico clearance. Do not add, remove, move, merge, enlarge or subdivide buildings or roads. No walls or roofs across courtyards, streets or portico openings. Do not treat unbuilt ground as permission to add massing.
- Add surface texture, subtle material shading and illustration detail within existing shapes only. Preserve visible portico supports and gaps; no guessed historical arches. Retain the large roof's existing segmentation, including its estimated shed planes.
- Do not invent bell towers, belfries, clock faces, chapels, pinnacles, buttresses, monumental facades, statues, signage, text, traffic, people, cars, trains, birds, furniture or fake trees. Do not repair incomplete monuments from memory or infer hidden/front-facing details from a back-facing camera view. Existing roof rise, palace roof transitions and facade/clock details are unverified; this image must not present them as historically measured facts.
- Reference images 3 and 4 are appearance guides only. Do not copy their buildings, street grid, coastline, beach, roof clutter, palms or layout. No reference photos or QA overlays are attached. There are no painted neighbours: this single window cannot establish painted-to-painted seams.

Output exactly one square 1024x1024 PNG, opaque, no text, labels, watermarks, border, vignette, black bands or alpha holes. Preserve the raw output before registration. Do not generate a second image for corrections. The designated isolated raw output path is run/-1_-1/raw.png.
`;

export function liveCommand(sha256: string, expires: string) {
  assert(/^[a-f0-9]{64}$/.test(sha256)); assert(Number.isFinite(Date.parse(expires)));
  return `node --import tsx docs/bologna-paint-live.ts --window=-1,-1 --max-calls=1 --attempts=1 --workers=1 --approve=${sha256} --expires=${expires}`;
}
export function approvalCheck(args: string[], expectedHash: string, now = Date.now()) {
  const options: Record<string, string> = {};
  for (const arg of args) {
    const match = /^--(window|max-calls|attempts|workers|approve|expires)=(.+)$/.exec(arg);
    assert(match && !(match[1] in options), `Unsupported, broad or duplicate argument: ${arg}`);
    options[match[1]] = match[2];
  }
  assert.equal(options.window, "-1,-1", "Only the frozen single window is allowed");
  for (const key of ["max-calls", "attempts", "workers"]) assert.equal(options[key], "1", `${key} must be exactly one`);
  assert.equal(options.approve, expectedHash, "Missing or mismatched explicit approval hash");
  const end = Date.parse(options.expires);
  assert(Number.isFinite(end) && end > now && end <= now + 24 * 3600_000, "Approval expired or more than 24h ahead; refresh preflight, never infer approval");
  return options;
}
export async function validatePreflight() {
  noSymlinks(EXPERIMENT);
  const m = read<PaintManifest>(MANIFEST);
  assert.equal(m.root, EXPERIMENT); assert.equal(m.source, SOURCE); assert.equal(m.area, "piazza-maggiore");
  assert.deepEqual(m.policy, { imageCalls: 1, retries: 0, workers: 1, outputs: 1, maxApprovalAgeHours: 24 });
  assert.deepEqual({ REGIONS, CITIES }, m.configuration);
  useRegion("bologna"); assert.deepEqual(camera(), m.camera); assert.equal(REGIONS.bologna.geoidM, m.geoidM);
  assert.deepEqual(read<SourceManifest>(SOURCE + "/manifest.json").bbox, m.bbox);
  const protectedFiles = verifyPins(m.preservation);
  for (const root of m.protectedRoots) assert.equal(existsSync(absolute(root.path)), root.existed, `Protected root presence changed: ${root.path}`);
  verifyPins(m.inputs); verifyPins(m.artifacts);
  assert.equal(Object.keys(m.inputs).length, 4, "Exactly four model input images");
  for (const p of Object.keys(m.inputs)) await imageCheck(p, p.endsWith("style.png") ? undefined : WIN);
  assert.deepEqual([m.window.i, m.window.j], WINDOW);
  const compose = await composeWindow(read<SourceManifest>(SOURCE + "/manifest.json"), ...WINDOW);
  assert.deepEqual(compose.box, m.window); assert.equal(compose.groundM, m.heightConversion.groundM);
  assert.equal(digest(compose.input), m.inputs[EXPERIMENT + "/input/input.png"].sha256, "Color crop differs from frozen render");
  assert.equal(digest(compose.height), m.inputs[EXPERIMENT + "/input/height.png"].sha256, "Height conversion differs from verified local mapping");
  assert(!existsSync(absolute(EXPERIMENT + "/run")), "Live output already exists: no resume/overwrite allowed");
  return { m, hash: pin(MANIFEST).sha256, protectedFiles, inputImages: 4, modelCalls: 0, writes: 0, overwrite: false, sourcePairs: 10, liveReady: false, blocker: CAP_BLOCKER };
}
