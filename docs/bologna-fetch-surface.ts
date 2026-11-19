/** BO-001 independent ground fetch, bypassing optional slow rail-route downloads.
 * node docs/bologna-fetch-surface.ts [--partial]
 * --partial deliberately uses only roads/rail and landuse; never publish that cache.
 * No missing query is silently converted to empty data. Cached responses remain untouched.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { AREAS } from "../pipeline/src/areas.ts";
const [s,w,n,e] = AREAS["piazza-maggiore"].bbox, m=.02;
const b=`(${s-m},${w-m},${n+m},${e+m})`;
// Same selections as fetch.ts; kept explicit so the proof's incomplete selection is reviewable.
const parts = [
  `way["highway"]["tunnel"!~"yes|building_passage"]${b};way["area:highway"]${b};way["railway"~"^(rail|light_rail|tram)$"]["tunnel"!="yes"]${b};`,
  `nwr["landuse"]${b};`,
  `nwr["leisure"~"^(park|garden|pitch|playground|stadium|track|golf_course|swimming_pool|dog_park|nature_reserve|recreation_ground|marina|sports_centre)$"]${b};
   nwr["natural"~"^(water|beach|sand|scrub|grassland|wood|wetland|coastline|bare_rock|heath)$"]${b};nwr["water"]${b};nwr["waterway"="riverbank"]${b};
   nwr["amenity"~"^(parking|school|university|college|hospital|grave_yard)$"]${b};nwr["man_made"~"^(pier|breakwater|groyne|bridge)$"]${b};nwr["place"="square"]${b};
   nwr["golf"~"^(bunker|green|tee|fairway|driving_range|rough)$"]${b};way["aeroway"~"^(runway|taxiway|apron|helipad)$"]${b};`,
];
const partial = process.argv.includes("--partial");
const cache="data/raw/bologna-audit/", out="data/raw/piazza-maggiore/";
mkdirSync(cache,{recursive:true}); mkdirSync(out,{recursive:true});
const elements = new Map<string,any>();
const provenance = [];
for (const [i,q] of parts.slice(0,partial?2:3).entries()) {
  const file=cache+`ground-part${i+1}.json`;
  let data;
  if (existsSync(file)) data=JSON.parse(readFileSync(file,"utf8"));
  else {
    const r=await fetch("https://maps.mail.ru/osm/tools/overpass/api/interpreter",{
      method:"POST",body:new URLSearchParams({data:`[out:json][timeout:50];(${q});out body geom;`}),signal:AbortSignal.timeout(70000),
    });
    if (!r.ok) throw Error(`ground part ${i+1}: HTTP ${r.status}`);
    data=await r.json();
    if (data.remark || !Array.isArray(data.elements)) throw Error(JSON.stringify(data));
    writeFileSync(file,JSON.stringify(data));
  }
  if (data.remark || !Array.isArray(data.elements)) throw Error(`invalid cached response: ${file}`);
  for (const el of data.elements) elements.set(el.type+el.id,el);
  provenance.push({file,elements:data.elements.length,osm3s:data.osm3s});
}
// Preserve any existing ground.json; replacement requires explicit manual review of provenance.
if (!existsSync(out+"ground.json")) writeFileSync(out+"ground.json",JSON.stringify({elements:[...elements.values()]}));
writeFileSync(cache+"surface-provenance.json",JSON.stringify({complete:!partial,parts:provenance,elements:elements.size},null,2)+"\n");
if (partial && !existsSync(out+"BO-001-partial-surface.json")) writeFileSync(out+"BO-001-partial-surface.json",JSON.stringify({complete:false,included:"fetch.ts parts[0:2]",missing:"fetch.ts parts[2]",reason:"Explicit --partial proof only; not publishable"},null,2));
console.log({complete:!partial,elements:elements.size,groundFile:"preserved if already present"});
