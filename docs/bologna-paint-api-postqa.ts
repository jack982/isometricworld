/** Planned offline post-generation QA. Never imports a provider; preserves raw bytes and writes new QA files only. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { absolute, digest, read, validatePreflight } from "./bologna-paint-support.ts";
import { API_ROOT, existsNoFollow, INPUTS, readRegular, rejectSymlinks } from "./bologna-paint-api-core.ts";

interface Anchor { label: string; pixel: [number, number]; source: string }
function sobel(gray: Buffer, width: number, height: number) {
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const k = y * width + x;
    const dx = gray[k + 1 - width] + 2 * gray[k + 1] + gray[k + 1 + width] - gray[k - 1 - width] - 2 * gray[k - 1] - gray[k - 1 + width];
    const dy = gray[k + width - 1] + 2 * gray[k + width] + gray[k + width + 1] - gray[k - width - 1] - 2 * gray[k - width] - gray[k - width + 1];
    edges[k] = Math.hypot(dx, dy);
  }
  return edges;
}
/** Distance of one nearby reference edge to an output edge. Review trigger, not a cadastral identity test. */
export function anchorDrift(reference: Float32Array, output: Float32Array, width: number, height: number, x: number, y: number) {
  let chosen: [number, number] | null = null, best = Infinity;
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
    const px = Math.round(x) + dx, py = Math.round(y) + dy, distance = Math.hypot(dx, dy);
    if (px > 0 && px < width - 1 && py > 0 && py < height - 1 && reference[py * width + px] >= 60 && distance < best) { chosen = [px, py]; best = distance; }
  }
  if (!chosen) return { status: "NOT_VERIFIED_NO_REFERENCE_EDGE", distancePx: null };
  let distance = Infinity;
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
    const px = chosen[0] + dx, py = chosen[1] + dy;
    if (px > 0 && px < width - 1 && py > 0 && py < height - 1 && output[py * width + px] >= 60) distance = Math.min(distance, Math.hypot(dx, dy));
  }
  return { status: distance <= 4 ? "WITHIN_HEURISTIC_REQUIRES_HUMAN" : "INVESTIGATE_DRIFT", distancePx: Number.isFinite(distance) ? distance : null, referenceEdge: chosen };
}
export async function postQaMetrics(input: Buffer, height: Buffer, raw: Buffer, anchors: Anchor[]) {
  const meta = await sharp(raw).metadata(); assert.equal(meta.format, "png"); assert.deepEqual([meta.width, meta.height], [1024, 1024]);
  const { data } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let alphaMin = 255; for (let k = 3; k < data.length; k += 4) alphaMin = Math.min(alphaMin, data[k]);
  const gray = async (b: Buffer) => sharp(b).removeAlpha().greyscale().blur(.8).raw().toBuffer();
  const refEdge = sobel(await gray(input), 1024, 1024), outEdge = sobel(await gray(raw), 1024, 1024);
  const h = await sharp(height).removeAlpha().greyscale().raw().toBuffer();
  let groundPixels = 0, refGroundEdges = 0, outGroundEdges = 0;
  for (let k = 0; k < h.length; k++) if (h[k] < 12) { groundPixels++; if (refEdge[k] >= 60) refGroundEdges++; if (outEdge[k] >= 60) outGroundEdges++; }
  const grid = await sharp(raw).removeAlpha().resize(8, 8, { fit: "fill" }).raw().toBuffer();
  const darkCells = Array.from({ length: 64 }, (_, k) => (grid[k * 3] + grid[k * 3 + 1] + grid[k * 3 + 2]) / 3).map((mean, cell) => ({ mean, cell })).filter(c => c.mean < 15);
  const bands = await Promise.all([{ left: 0, top: 0, width: 1024, height: 32 }, { left: 0, top: 992, width: 1024, height: 32 }, { left: 0, top: 0, width: 32, height: 1024 }, { left: 992, top: 0, width: 32, height: 1024 }].map(async box => ({ box, means: (await sharp(raw).extract(box).stats()).channels.slice(0, 3).map(c => c.mean) })));
  const colour = (await sharp(raw).stats()).channels.slice(0, 3).map(c => ({ mean: c.mean, stdev: c.stdev }));
  return { dimensions: [meta.width, meta.height], alphaMin, darkCells, colour, outerBands: bands,
    anchors: anchors.map(a => ({ ...a, ...anchorDrift(refEdge, outEdge, 1024, 1024, ...a.pixel) })),
    lowHeightStructure: { groundPixels, referenceEdges: refGroundEdges, outputEdges: outGroundEdges, review: outGroundEdges > Math.max(refGroundEdges * 2, refGroundEdges + groundPixels * .03), limitation: "Texture can add edges; low height is not an exact road/courtyard mask or semantic roof detector" },
    semantics: { roadEdges: "ANCHOR_HEURISTIC_AND_HUMAN_REQUIRED", roofFootprints: "ANCHOR_HEURISTIC_AND_HUMAN_REQUIRED", courtyardVoids: "NOT_VERIFIED_HUMAN_REQUIRED", porticoGap: "NOT_VERIFIED_HUMAN_REQUIRED", treeLocations: "NOT_VERIFIED_HUMAN_REQUIRED", inventedObjects: "NOT_VERIFIED_HUMAN_REQUIRED", styleQuality: "NOT_TESTED_INDEPENDENT_HUMAN_REQUIRED" },
    automaticFidelityPass: false, anyAddedRemovedOrMergedBuildingOrRoad: "If found by review: automatic fidelity FAIL; registration cannot excuse it" };
}
async function main() {
  assert.equal(process.argv.length, 2, "NO_ARBITRARY_PATHS_OR_FLAGS");
  const frozen = await validatePreflight();
  const run = absolute(API_ROOT + "/run-minus1-minus1"), rawPath = run + "/raw.png", qaDir = run + "/qa";
  rejectSymlinks(run); assert(!existsNoFollow(qaDir), "QA_OUTPUT_EXISTS_NO_OVERWRITE");
  const metadata = JSON.parse(readRegular(run + "/metadata.json").toString());
  assert.equal(metadata.status, "RAW_RESULT_SAVED_PENDING_QA_AND_HUMAN");
  assert.deepEqual(metadata.inputHashes, INPUTS.map(path => ({ path, pin: frozen.m.inputs[path] })));
  const raw = readRegular(rawPath); assert.equal(digest(raw), metadata.rawSha256);
  const input = readRegular(absolute(INPUTS[0])), height = readRegular(absolute(INPUTS[1]));
  const anchors = read<{ anchors: Anchor[] }>("data/bo-004s-paint/candidate/selection.json").anchors; assert.equal(anchors.length, 9);
  const { applyRegistration, register } = await import("../pipeline/src/register.ts");
  const metrics = await postQaMetrics(input, height, raw, anchors), registration = await register(absolute(INPUTS[0]), rawPath);
  mkdirSync(qaDir, { mode: 0o700 });
  // Diagnostic alignment is a separate file. Raw drift is always retained, even when corrected.
  const warp = registration.texture >= .05 && registration.score > registration.identity + .01;
  const registeredPath = qaDir + "/registered.png";
  await applyRegistration(rawPath, registeredPath, warp ? registration : { ...registration, scale: 1, dx: 0, dy: 0 });
  const registered = readRegular(registeredPath), registeredMetrics = await postQaMetrics(input, height, registered, anchors);
  const report = { rawSha256: digest(raw), registeredSha256: digest(registered), registration, raw: metrics, registered: registeredMetrics, minMatchHeuristic: .45, driftReviewPx: 4, humanAcceptance: "NOT_TESTED", measuredMonumentFidelity: "NOT_VERIFIED", paintedNeighbourSeams: "NOT_TESTED_ONE_WINDOW", status: "PENDING_HUMAN_NOT_A_GO" };
  writeFileSync(qaDir + "/qa.json", JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  assert.equal(digest(readRegular(rawPath)), metadata.rawSha256, "RAW_WAS_CHANGED");
  console.log(JSON.stringify({ status: report.status, qa: API_ROOT + "/run-minus1-minus1/qa/qa.json" }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
