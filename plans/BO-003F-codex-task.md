# BO-003F — Bologna landmark fidelity gate before AI painting

**Status:** Proposed follow-up after BO-003 technical pilot. **Scope:** narrow geometric-fidelity and source verification, not a citywide design sprint.

## Context and objective

BO-003 completed a bounded technical pilot using 13 source-ID architectural volumes (9 San Petronio parts, 2 Palazzo d'Accursio portions, 2 ordinary buildings) and one open 17-column portico (CTC 21018). Tile and regression gates passed, but image review did **not** establish that either landmark is architecturally recognizable without color highlighting. San Petronio still looks like a tall regular brick mass; the basilica's marble/brick façade and characteristic elevations are absent. The palace has only two locally modeled roof portions, while the clock tower identity remains unresolved. The portico is a valid open colonnade pilot, not a historically faithful arcade.

**Success criterion:** improve independently verified silhouette/visible architectural cues for the two landmark sites while preserving accurate source footprints and the BO-001/BO-002/BO-003 snapshots; if verification is unavailable, mark the feature unresolved rather than inventing metric geometry. Prepare a measured GO / NO-GO for a subsequent small-scale AI-painting test.

## Constraints / guardrails

- Read `AGENTS.md`, `docs/bologna-architecture-audit.md`, `docs/bologna-architecture-qa.json`, `docs/bologna-architecture-gate0.json`, and code in `pipeline/src/bologna-*`, `pipeline/page/architecture.ts`, `pipeline/page/renderer.ts`, before changing anything.
- Use the actual Git working tree as ground truth. Inspect `git status`; do not delete, rewrite, auto-commit, reset, or overwrite any user work or pre-existing generated outputs. Ensure BO-003 modifications are appropriately committed or checkpointed *by the user* before implementing this follow-up. Never silently commit.
- Preserve fixed region origin, heading 315°, pitch, resolution, tile schema, EGM2008 geoid parameter, terrain, verified CTC partitions/eaves and 712 courtyard rings. Do not infer unverified roof ridges or absolute elevations.
- Preserve independent BO-001R OSM, BO-002 municipal and BO-003 pilot outputs and their checksum inventories. Build only into a **new** isolated root `data/bo-003f-landmarks` (or another fresh root documented upfront). Extend runner safeguards with an explicit allowlist, not a permissive prefix check. Never rerun commands that clear an existing root.
- No AI painting, remote publish, VPS/R2 deployment, data deletion or other-city changes. Keep potential upstream contribution feasible; avoid hardcoded Bologna branches in generic render paths beyond metadata opt-in.
- No copyrighted images or proprietary 3D models downloaded for reuse without compatible rights. Official texts/photographs may serve as references only where usage is permitted; keep source/rights/provenance recorded.

## Gate 0 — Bounded source and fidelity audit (read-only)

1. Document exactly which CTC parts represent the San Petronio façade, nave, aisles, apse, bell tower and Palazzo d'Accursio west/south ranges / clock tower, distinguishing **verified**, **probable**, **unknown**. Use stable CTC IDs, OSM/Wikidata IDs, and bounded geometry overlap. A name or near proximity is not proof.
2. Audit the unresolved church height conventions: CTC 47.3 m nave eave, 27.8 m aisle eaves and 59.7 m bell-tower volume versus external descriptions such as 44 m overall building height. Identify the specific measurement semantics where possible; do not tune the mesh by arbitrary scalings to make the image look right.
3. Look for authoritative, reuse-compatible roof / façade / clock / portico evidence (communal GIS, government heritage records, openly licensed photos or models). For each candidate record geometry fidelity/coverage, currentness, datum, license, and whether it supports measured dimensions or **appearance only**.
4. Create `docs/bologna-landmark-fidelity-audit.md` with a source matrix, unknowns, and proposed allowable overrides. Explicitly compare the source-verified elements against all three BO-003 JPGs.
5. **STOP RULE:** if identity/rights cannot be validated for a requested feature, mark it unresolved and do not create a speculative "measured" override. A bounded decorative estimate may be considered only if it is clearly labeled as procedural and visually testable separately.

## Gate A — Targeted geometry improvement (only where evidence supports it)

- **San Petronio:** prioritize the façade outline, nave/aisle stepped silhouette, chapel rhythm and approximate roof segmentation. Preserve the actual CTC footprint and eave. Avoid giving a generic uniform brick wall an invented set of Gothic windows. If only façade appearance evidence is available, deliver a documented visual proposal, not a falsely measured mesh.
- **Palazzo d'Accursio:** verify clock tower and its source geometry. Only opt into a clock/belfry feature if identification is conclusive. Improve the roof transition along the two already verified palace volumes where geometrically defensible, without repainting the entire surrounding block.
- **Portico:** current 17-column feature stays the reference open structure. Add arches/accurate bay proportions only if reliable evidence and a repeatable geometry generator are available; otherwise leave it unchanged with a documented next requirement.
- Generalize only *proven useful* reusable geometry techniques (roof/roofline, façade mask, arcade) via optional metadata + renderer hook; no citywide palette rollout and no damage to ordinary buildings.
- Implement tests for every chosen feature: source-ID allowlist, footprint containment and holes, roof height bounds/eave unchanged, wall/roof closure, overlap and terrain anchoring, tile seams and regressions.

## Gate B — Visual deliverables and acceptance

1. Produce **same camera / same tile / same lighting** before-and-after images of: San Petronio façade and massing, Palazzo d'Accursio including the candidate clock location, Piazza Maggiore overall, portico 21018. A neutral-desaturated or material-off silhouette comparison is required to prove that *geometry*, not red paint, made the landmark recognizable.
2. Produce `docs/bologna-landmark-fidelity-proof.jpg`, `docs/bologna-landmark-fidelity-comparison.jpg`, `docs/bologna-landmark-fidelity-crops.jpg` (or explain exact alternatives), `docs/bologna-landmark-fidelity-qa.json` and `docs/bologna-landmark-fidelity-report.md`.
3. Validate all expected render and height tiles, shared seams, eaves/terrain, 712 courtyards, tree count, CTC source metadata, and matching BO-001R/BO-002/BO-003 baseline tile hashes wherever practical. Report any test that cannot be rerun due to absent datasets.
4. Record three separate conclusions: **geometric validity**, **architectural recognizability** (human review still required), **measured fidelity** (do not claim if unverified). The agent's own image review is not independent human validation.
5. Supply a decision matrix with `GO AI painting pilot` / `REFINE GEOMETRY` / `BLOCKED BY MISSING EVIDENCE`, including approximate effort and evidence required. Favor a **small crop / single tile painting trial** over city-wide AI painting if silhouette is credible.

## Gate C — Engineering checks and handoff

Run relevant tests, pipeline and QA TypeScript, `git diff --check`, credits/licence validation, visual tile gate and preservation manifest checks. Report the existing web `ImportMeta.env` issue as a known separate concern unless the scope specifically reaches local viewer readiness. Do not conceal failed tests behind a generic overall PASS.

Final handoff must list: files changed and untracked files, all commands run, exact source IDs and source URLs used, factual versus estimated geometry, render/checksum paths, regressions, unresolved height/clock/portico questions and recommendations for the next task.

## Explicitly out of scope

Whole-city recoloring, building-by-building modeled façades, citywide portico generation, transit overlays, traffic, birds, user analytics, hosting, R2, painting, auto commits and deployment. Do not spend effort on unverified hyperrealistic detail; the test is whether accurate, easily recognized Bologna landmarks can be achieved without compromising the GIS foundation.
