/** Reproduce BO-001 statistics: node docs/bologna-data-audit.ts (Node 24+).
 * Downloads and metadata paths are documented in bologna-data-audit.md.
 * Structural geometry checks only: no claim of OGC topology validity.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = "data/raw/bologna-audit/";
const bbox = [44.4893, 11.337, 44.4983, 11.349];
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const count = (vs: any[]) => Object.fromEntries([...new Set(vs)].map(v => [String(v), vs.filter(x => x === v).length]));
const stats = (vs: number[]) => {
  const a = vs.filter(Number.isFinite).sort((a,b) => a-b);
  return { n: a.length, min: a[0], median: a[Math.floor(a.length/2)], p95: a[Math.floor(a.length*.95)], max: a.at(-1) };
};
const result: Record<string, any> = { bbox, geometryChecks: "finite lon/lat, expected type, ring closure and size; not self-intersection/OGC validity" };
for (const [name, id, key] of [["buildings", "c_a944ctc_edifici_pl", "codice_ogg"], ["trees", "alberi-manutenzioni", "num_pt"]]) {
  const file = root + name + ".geojson", bytes = readFileSync(file);
  const fc = JSON.parse(bytes.toString()), fs = fc.features;
  const meta = read(root + "bologna-" + name + "-metadata.json");
  const points = (c: any): number[][] => typeof c?.[0] === "number" ? [c] : (c ?? []).flatMap(points);
  let bad = 0, unclosed = 0, short = 0, holes = 0;
  const extent = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of fs) {
    if (!f.geometry || f.geometry.type !== (name === "buildings" ? "Polygon" : "Point")) { bad++; continue; }
    const ps = points(f.geometry.coordinates);
    if (!ps.length || ps.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0])>180 || Math.abs(p[1])>90)) bad++;
    for (const [x,y] of ps) { extent[0]=Math.min(extent[0],x); extent[1]=Math.min(extent[1],y); extent[2]=Math.max(extent[2],x); extent[3]=Math.max(extent[3],y); }
    if (name === "buildings") {
      holes += Math.max(0, f.geometry.coordinates.length-1);
      for (const r of f.geometry.coordinates) {
        if (r.length < 4) short++;
        if (JSON.stringify(r[0]) !== JSON.stringify(r.at(-1))) unclosed++;
      }
    }
  }
  // Record centroid in bbox, intentionally not polygon intersection or municipal completeness.
  const patch = fs.filter((f: any) => { const p=f.properties.geo_point_2d; return p && p.lat>=bbox[0] && p.lat<=bbox[2] && p.lon>=bbox[1] && p.lon<=bbox[3]; });
  const summary = (features: any[]) => {
    const ps = features.map(f => f.properties);
    if (name === "trees") return { heightClasses: count(ps.map(p=>p.cl_h)), speciesTop20: Object.entries(count(ps.map(p=>p.classe))).sort((a,b)=>b[1]-a[1]).slice(0,20), missingSpecies: ps.filter(p=>!p.classe).length, missingPlantingDate: ps.filter(p=>!p.data_impnt).length, updateYears: count(ps.map(p=>p.data_agg?.slice(0,4) ?? null)) };
    return { height: stats(ps.map(p=>p.altezza_gr)), zeroHeight: ps.filter(p=>p.altezza_gr===0).length, missingHeight: ps.filter(p=>p.altezza_gr==null).length, negativeHeight: ps.filter(p=>p.altezza_gr<0).length, over100m: ps.filter(p=>p.altezza_gr>100).length, missingOrZeroElevations: ps.filter(p=>!p.quota_gron || !p.quota_pied).length, inconsistentHeightOver10cm: ps.filter(p=>p.quota_gron>0 && p.quota_pied>0 && Math.abs(p.quota_gron-p.quota_pied-p.altezza_gr)>.1).length, descriptions: count(ps.map(p=>p.descrizion)), origins: count(ps.map(p=>p.origine)) };
  };
  const ids=fs.map((f: any)=>f.properties[key]);
  result[name] = { id, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length, records: fs.length, metadataRecords: meta.metas.default.records_count, license: meta.metas.default.license, modified: meta.metas.default.modified, schema: meta.fields.map((f: any)=>({name:f.name,type:f.type,label:f.label})), extentLonLat: extent, badGeometry: bad, unclosedRings: unclosed, shortRings: short, holes, duplicateIds: ids.length-new Set(ids).size, missingIds: ids.filter((x:any)=>x==null).length, all:summary(fs), patch: { records:patch.length, ...summary(patch) } };
  if (fs.length !== meta.metas.default.records_count || meta.metas.default.license !== "CC BY 4.0") throw new Error(`metadata/export mismatch: ${name}`);
}
writeFileSync("docs/bologna-data-validation.json", JSON.stringify(result,null,2)+"\n");
console.log("Validated exports against metadata; wrote docs/bologna-data-validation.json");
