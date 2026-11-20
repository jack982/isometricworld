/** Create the BO-004S input package once. No model, subprocess, network, export or normal painter. */
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { enuToPixel } from "../pipeline/src/camera.ts";
import { REGIONS, CITIES } from "../pipeline/src/places.ts";
import {
  absolute, BOLOGNA_PROMPT, CAP_BLOCKER, composeWindow, createFreshRoot, EXPERIMENT,
  imageCheck, inventory, MANIFEST, noSymlinks, pin, read, SOURCE, sourceAudit, verifyPins, WINDOW,
  type FilePin, type PaintManifest,
} from "./bologna-paint-support.ts";

assert.equal(process.argv.length, 2, "Preparation takes no flags; one frozen candidate only");
assert(!existsSync(absolute(EXPERIMENT)), "Experiment root already exists; refuse overwrite");
for (const p of [MANIFEST, "docs/bologna-paint-window-input.png", "docs/bologna-paint-window-qa.png"]) assert(!existsSync(absolute(p)), `Evidence already exists: ${p}`);
const audit = await sourceAudit();
const { box, input, height, groundM, groundSamples } = await composeWindow(audit.manifest, ...WINDOW);
const protectedPaths = ["data/raw", "data/derived", "data/web", "data/web-state", ...readdirSync(absolute("data")).filter(p => /^bo-(001r|002-|003-|003f-|005p-)/.test(p)).map(p => "data/" + p)];
const oldDocs = readdirSync(absolute("docs")).filter(p => p.startsWith("bologna-") && !/^bologna-paint[.-]/.test(p)).map(p => "docs/" + p);
const sharedFiles = ["AGENTS.md", "README.md", "ATTRIBUTION.md", "pipeline/src/paint.ts", "pipeline/src/register.ts", "pipeline/src/paths.ts", "pipeline/src/areas.ts", "pipeline/src/places.ts", "pipeline/src/camera.ts", "pipeline/src/heights.ts", "pipeline/style", "plans/BO-004S-codex-task.md"];
const preservation = inventory([...protectedPaths, ...oldDocs, ...sharedFiles]);
const historicalChecks = [];
for (const path of ["docs/bologna-viewer-inputs.json", "docs/bologna-viewer-checksums.json", "docs/bologna-landmark-fidelity-checksums.json"]) {
  const old = read<{ files: Record<string, FilePin> }>(path);
  // Data and evidence are immutable; code from older checkpoints can legitimately have evolved.
  const files = Object.fromEntries(Object.entries(old.files).filter(([p]) => p.startsWith("data/") || p.startsWith("docs/")));
  verifyPins(files); historicalChecks.push({ path, verifiedDataAndDocs: Object.keys(files).length });
}
// All preparations above are read-only. Only now allocate the one named, fresh experiment root.
createFreshRoot();
const save = (p: string, value: unknown) => writeFileSync(absolute(p), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
for (const d of ["input/source/render", "input/source/height", "candidate", "prompts", "manifests", "compatibility"]) mkdirSync(absolute(EXPERIMENT + "/" + d), { recursive: true });
function copy(source: string, dest: string) {
  noSymlinks(source); noSymlinks(dest); assert(!existsSync(absolute(dest)));
  copyFileSync(absolute(source), absolute(dest)); assert.deepEqual(pin(source), pin(dest));
}
for (const t of audit.manifest.tiles) for (const layer of ["render", "height"]) copy(`${SOURCE}/${layer}/${t.x}_${t.y}.png`, `${EXPERIMENT}/input/source/${layer}/${t.x}_${t.y}.png`);
copy(SOURCE + "/manifest.json", EXPERIMENT + "/input/source/manifest.json");
writeFileSync(absolute(EXPERIMENT + "/input/input.png"), input, { flag: "wx" });
writeFileSync(absolute(EXPERIMENT + "/input/height.png"), height, { flag: "wx" });
copy("pipeline/style/reference.png", EXPERIMENT + "/input/style.png");
copy("pipeline/style/trees-stuttgart.png", EXPERIMENT + "/input/trees.png");
writeFileSync(absolute(EXPERIMENT + "/prompts/prompt.txt"), BOLOGNA_PROMPT, { flag: "wx" });
await imageCheck(EXPERIMENT + "/input/input.png", 1024); await imageCheck(EXPERIMENT + "/input/height.png", 1024);

// Existing metric data is used only to annotate the QA overlay; it is never an extra model image.
type Point = [number, number];
interface Building { id: string; ctcId: number | null; outer: Point[]; holes: Point[][]; relativeEaveM: number; landmark?: string; upliftM: number }
const buildings = new Map<string, Building>(), treeTuples = new Map<string, number[]>();
for (const f of readdirSync(absolute(SOURCE + "/scene")).filter(f => f.endsWith(".json"))) {
  const bin = read<{ b: [Point[], number, number, null, Point[][], { id: string; ctcId: number | null; architecture?: { landmark?: string; roof: { upliftM: number } } }][]; t: number[][] }>(SOURCE + "/scene/" + f);
  for (const [outer, h, , , holes, metadata] of bin.b) if (metadata) buildings.set(metadata.id, { id: metadata.id, ctcId: metadata.ctcId, outer, holes: holes || [], relativeEaveM: h, landmark: metadata.architecture?.landmark, upliftM: metadata.architecture?.roof.upliftM || 0 });
  for (const t of bin.t) treeTuples.set(JSON.stringify(t), t);
}
const meta = read<{ x0: number; y0: number; nx: number; ny: number; step: number }>(SOURCE + "/ground/meta.json");
const hbuf = readFileSync(absolute(SOURCE + "/ground/height.bin"));
const values = new Float32Array(hbuf.buffer, hbuf.byteOffset, hbuf.length / 4);
function ground(x: number, y: number) {
  const fx = Math.min(meta.nx - 1.001, Math.max(0, (x - meta.x0) / meta.step)), fy = Math.min(meta.ny - 1.001, Math.max(0, (y - meta.y0) / meta.step));
  const ix = Math.floor(fx), iy = Math.floor(fy), a = fx - ix, b = fy - iy, k = iy * meta.nx + ix;
  return (values[k] * (1 - a) + values[k + 1] * a) * (1 - b) + (values[k + meta.nx] * (1 - a) + values[k + meta.nx + 1] * a) * b;
}
const project = ([x, y]: Point, h = ground(x, y)): Point => { const p = enuToPixel([x, y, h]); return [p[0] - box.x, p[1] - box.y]; };
const inWindow = ([x, y]: Point) => x >= 0 && x < 1024 && y >= 0 && y < 1024;
function touches(points: Point[]) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return Math.max(...xs) >= 0 && Math.min(...xs) < 1024 && Math.max(...ys) >= 0 && Math.min(...ys) < 1024;
}
const lines: string[] = [], features: unknown[] = [], anchors: { label: string; pixel: Point; source: string }[] = [];
const line = (p: Point[], color: string, closed: boolean) => `<${closed ? "polygon" : "polyline"} points="${p.map(q => q.map(v => v.toFixed(2)).join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
for (const b of buildings.values()) {
  const top = Math.max(...b.outer.map(p => ground(...p))) + b.relativeEaveM;
  const basePoints = b.outer.map(p => project(p)), roof = b.outer.map(p => project(p, top + b.upliftM));
  if (!touches([...basePoints, ...roof])) continue;
  features.push({ id: b.id, ctcId: b.ctcId, landmark: b.landmark, holes: b.holes.length, projectedBounds: [Math.min(...roof.map(p => p[0])), Math.min(...roof.map(p => p[1])), Math.max(...roof.map(p => p[0])), Math.max(...roof.map(p => p[1]))], fullRoofInWindow: roof.every(inWindow), projection: "Conservative eave+max-uplift QA outline; no occlusion test" });
  lines.push(line(basePoints, "#00c9eb", true), line(roof, "#ffd928", true));
  for (const hole of b.holes) lines.push(line(hole.map(p => project(p)), "#fc49e0", true));
  if (b.landmark && anchors.filter(a => a.source === b.landmark).length < 2) {
    const p = roof.find(inWindow); if (p) anchors.push({ label: b.ctcId + " roof corner", pixel: p, source: b.landmark });
  }
  if (b.holes.length && anchors.filter(a => a.source === "courtyard").length < 2) {
    const p = b.holes[0].map(p => project(p)).find(inWindow); if (p) anchors.push({ label: b.ctcId + " courtyard", pixel: p, source: "courtyard" });
  }
}
const groundFeatures = read<{ k: string; l?: Point[]; r?: Point[][] }[]>(SOURCE + "/ground/features.json");
const roadKinds = new Set(["street", "lane", "path", "plaza", "paving"]);
const roadCounts: Record<string, number> = {};
for (const [index, f] of groundFeatures.entries()) {
  if (!roadKinds.has(f.k)) continue;
  const paths = f.l ? [f.l] : f.r || [];
  for (const p of paths) {
    const pts = p.map(p => project(p)); if (!pts.length || !touches(pts)) continue;
    lines.push(line(pts, "#359aff", !f.l)); roadCounts[f.k] = (roadCounts[f.k] || 0) + 1;
    if (anchors.filter(a => a.source === "ground").length < 2) { const pixel = pts.find(inWindow); if (pixel) anchors.push({ label: `${f.k} ${index}`, pixel, source: "ground" }); }
  }
}
let treeCount = 0;
for (const [x, y, r, h] of treeTuples.values()) {
  const p = project([x, y], ground(x, y) + h + r); if (!inWindow(p)) continue;
  treeCount++; lines.push(`<ellipse cx="${p[0]}" cy="${p[1]}" rx="${r / .25}" ry="${r / .25 * .7071}" fill="none" stroke="#29db64"/>`);
}
const portico = read<{ portico: { id: string; poly: Point[][] } }>("data/bo-003-architecture/architecture.json").portico;
const porticoPoints = portico.poly[0].map(p => project(p));
const porticoInWindow = porticoPoints.some(inWindow);
if (porticoInWindow) { lines.push(line(porticoPoints, "#ff6329", true)); anchors.push({ label: "Portico 21018 gap", pixel: porticoPoints.find(inWindow)!, source: portico.id }); }
const fixedAnchors = anchors.slice(0, 9);
for (const [n, a] of fixedAnchors.entries()) lines.push(`<circle cx="${a.pixel[0]}" cy="${a.pixel[1]}" r="5" fill="white" stroke="black"/><text x="${a.pixel[0] + 7}" y="${a.pixel[1] - 7}" font-family="sans-serif" font-size="16" fill="white" stroke="black" stroke-width=".4">${n + 1}</text>`);
const svg = Buffer.from(`<svg width="1024" height="1024">${lines.join("")}</svg>`);
const overlay = await sharp(input).composite([{ input: svg }]).png().toBuffer();
writeFileSync(absolute(EXPERIMENT + "/candidate/qa-overlay.png"), overlay, { flag: "wx" });
const credits = [
  "BO-004S preparation only · QA view · NOT PAINTED · window (-1,-1)",
  "Map data © OpenStreetMap contributors · ODbL · openstreetmap.org/copyright",
  "Comune di Bologna – SIT / Settore Ambiente e Verde · CC BY 4.0 · adapted geometry / estimates",
  "Appearance only: Zairon, Congolandia.g, Raffacossa · CC BY-SA 4.0 · no photo pixels",
  "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under",
  "COPERNICUS by the European Union and ESA; all rights reserved",
  "House style / tree sheet: Dmytro Krasun · CC BY 4.0 plus source notices; existing assets only",
  "QA: cyan footprint; yellow conservative roof; magenta courtyard; blue ground; green tree; orange portico",
];
const footer = Buffer.from(`<svg width="1024" height="210"><rect width="1024" height="210" fill="white"/>${credits.map((s, i) => `<text x="12" y="${24 + i * 24}" fill="#222" font-size="14" font-family="sans-serif">${s}</text>`).join("")}</svg>`);
for (const [name, buf] of [["input", input], ["qa", overlay]] as const) await sharp({ create: { width: 1024, height: 1234, channels: 3, background: "white" } }).composite([{ input: buf, left: 0, top: 0 }, { input: footer, left: 0, top: 1024 }]).png().toFile(absolute(`docs/bologna-paint-window-${name}.png`));
const candidate = {
  rationale: "(-1,-1) contains the complete central church roof massing, palace pilot roof, open square, ordinary blocks, courtyard/tree context, and the small retained portico; no missing source cells. The north front facade is back-facing; the camera and geometry are not changed.",
  coverage: box.coverage, sourcePixels: "Unmodified crop; no CLAHE/saturation lift or painted-neighbour strips in this experiment",
  alternatives: [
    { window: [0, -1], reason: "Cuts central church/palace across the west border; weaker paired-landmark context" },
    { window: [-1, 0], reason: "Loses square/palace context above the north border" },
    { window: [-2, -2], reason: "Intersects known out-of-manifest corner; rejected by full-coverage gate" },
  ], buildings: features, groundFeatureCounts: roadCounts, trees: treeCount, porticoInWindow, anchors: fixedAnchors,
  limitations: ["Projected masks are QA-only and not occlusion-aware; they are not surveyed image segmentation", "Generic tree crown morphology, not Bologna species identification", "No real principal facade or verified clock geometry", "One window cannot validate painted-neighbour seams"],
};
save(EXPERIMENT + "/candidate/selection.json", candidate);
save(EXPERIMENT + "/candidate/source-validation.json", audit.tileChecks);
save(EXPERIMENT + "/manifests/preservation.json", { protectedPaths, files: preservation });
const licences = [
  { asset: "input/input.png + original height/source tiles", source: SOURCE, provenance: SOURCE + "/manifest.json", attributions: audit.manifest.attributions, licence: "Produced render: CC BY 4.0 plus ODbL/municipal/Copernicus source notices; inherited BO-003F appearance-only notices" },
  { asset: "input/style.png", source: "pipeline/style/reference.png", licence: "CC BY 4.0 by Dmytro Krasun plus source data credits", provenance: "ATTRIBUTION.md: This repository / AI painting; house-style painted Tel Aviv excerpt", original: pin("pipeline/style/reference.png"), restriction: "Style only, no source layout/material/roof-copying; existing AI asset, no generation in this task" },
  { asset: "input/trees.png", source: "pipeline/style/trees-stuttgart.png", licence: "CC BY 4.0 by Dmytro Krasun plus source data credits", provenance: "ATTRIBUTION.md: AI painting; project sheet derived from trees.png with Codex/ChatGPT", original: pin("pipeline/style/trees-stuttgart.png"), restriction: "Generic existing deciduous crown illustration only; no palms, new trees or surveyed species claim" },
];
save(EXPERIMENT + "/manifests/licences.json", licences);

// Offline inspection outputs were captured separately using help/features/schema only, never exec.
const upstream = JSON.parse(readFileSync("/tmp/bo-004s-upstream-commit.json", "utf8"));
const reference = { url: `https://raw.githubusercontent.com/krasun/isometricworld/${upstream.sha}/pipeline/src/paint.ts`, commit: upstream.sha, accessedAt: new Date().toISOString(), use: "Code compatibility only; never imported or executed" };
writeFileSync(absolute(EXPERIMENT + "/compatibility/upstream-paint.ts.txt"), readFileSync("/tmp/bo-004s-upstream-paint.ts"), { flag: "wx" });
save(EXPERIMENT + "/compatibility/upstream.json", { ...reference, file: pin(EXPERIMENT + "/compatibility/upstream-paint.ts.txt") });
for (const name of ["exec-help", "features", "login-status", "version"]) writeFileSync(absolute(`${EXPERIMENT}/compatibility/codex-${name}.txt`), readFileSync(`/tmp/bo-004s-codex-${name}.txt`), { flag: "wx" });
const cliVersion = readFileSync(absolute(EXPERIMENT + "/compatibility/codex-version.txt"), "utf8").trim();
const featuresText = readFileSync(absolute(EXPERIMENT + "/compatibility/codex-features.txt"), "utf8");
assert(/^image_generation\s+stable\s+true$/m.test(featuresText));
const login = readFileSync(absolute(EXPERIMENT + "/compatibility/codex-login-status.txt"), "utf8");
assert(login.includes("Logged in using ChatGPT"));
const artifacts = inventory([EXPERIMENT + "/input/source", EXPERIMENT + "/candidate", EXPERIMENT + "/prompts", EXPERIMENT + "/manifests", EXPERIMENT + "/compatibility", "docs/bologna-paint-support.ts", "docs/bologna-paint-prepare.ts", "docs/bologna-paint-plan.ts", "docs/bologna-paint-live.ts", "docs/bologna-paint.test.ts", "docs/bologna-paint-window-input.png", "docs/bologna-paint-window-qa.png"]);
const inputs = Object.fromEntries(["input", "height", "style", "trees"].map(name => { const p = `${EXPERIMENT}/input/${name}.png`; return [p, pin(p)]; }));
const manifest: PaintManifest = {
  status: "PENDING_LIVE_APPROVAL", baseCommit: "cec0a69", branch: "feature/bo-004s-paint-feasibility", createdAt: new Date().toISOString(),
  root: EXPERIMENT, source: SOURCE, area: "piazza-maggiore", camera: audit.manifest.camera, bbox: audit.manifest.bbox, geoidM: 39.647,
  window: box, inputs, artifacts, preservation, protectedRoots: protectedPaths.map(path => ({ path, existed: existsSync(absolute(path)) })), configuration: { REGIONS, CITIES },
  heightConversion: { groundM, formula: "R<<8|G centimetres + (heightBase - 100); floor(clamp(sqrt(max(0, ellipsoidM-groundM)/60)*255,0,255)); ground=5th percentile across all intersected full height tiles above seaH-0.5", kernel: "cubic 256 -> 1024, then exact global crop", groundSamples },
  backend: { name: "Codex CLI + native image generation (planned only)", cliVersion, imageFeature: true, authentication: "Existing ChatGPT login; status only, no credentials copied", model: "CLI default; no model override configured/validated, image submodel not disclosed by offline help", nativeCallCapVerified: false, blocker: CAP_BLOCKER },
  policy: { imageCalls: 1, retries: 0, workers: 1, outputs: 1, maxApprovalAgeHours: 24 }, licences, candidate, historicalChecks,
};
save(MANIFEST, manifest);
copy(MANIFEST, EXPERIMENT + "/manifests/input-manifest.json");
assert.equal(verifyPins(preservation), Object.keys(preservation).length);
console.log(JSON.stringify({ status: "PREPARED_STOP_BEFORE_LIVE", root: EXPERIMENT, window: box, sourcePairs: audit.tileChecks.length, protectedFiles: Object.keys(preservation).length, inputManifest: pin(MANIFEST), imageCalls: 0, liveReady: false, blocker: CAP_BLOCKER }, null, 2));
