/** node docs/bologna-render-qa.ts — validate and assemble the BO-001 procedural proof. */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { openArea, areaTiles } from "../pipeline/src/areas.ts";
import { ecefToEnu, llhToEcef, enuToLlh, camera } from "../pipeline/src/camera.ts";
const dir = "data/derived/piazza-maggiore/";
const a = openArea("piazza-maggiore"), tiles = areaTiles(a.bbox);
const buf = readFileSync(dir+"ground/height.bin");
const heights = new Float32Array(buf.buffer,buf.byteOffset,buf.length/4);
if (heights.some(x=>!Number.isFinite(x))) throw Error("nonfinite terrain");
let roundtripMaxM = 0;
for (const p of [[44.4938,11.343,0], [44.4893,11.337,100], [44.4983,11.349,200]]) {
  const q = enuToLlh(ecefToEnu(llhToEcef(p[0],p[1],p[2])));
  if (Math.abs(p[0]-q[0])>1e-8 || Math.abs(p[1]-q[1])>1e-8 || Math.abs(p[2]-q[2])>1e-4) throw Error("ENU roundtrip");
  roundtripMaxM = Math.max(roundtripMaxM,Math.abs(p[2]-q[2]));
}
const composition = [];
const pngs = [];
for (const [x,y] of tiles) {
  const file = `${dir}render/${x}_${y}.png`, heightFile = `${dir}height/${x}_${y}.png`;
  const m = await sharp(file).metadata(), h = await sharp(heightFile).metadata();
  if (m.width!==1024 || m.height!==1024 || h.width!==256 || h.height!==256) throw Error("tile dimensions");
  const stats = await sharp(file).stats();
  if (stats.channels.every(c=>c.stdev<1)) throw Error("blank tile");
  composition.push({input:file,left:(x+2)*1024,top:(y+2)*1024});
  pngs.push({x,y,minChannelStdev:Math.min(...stats.channels.slice(0,3).map(c=>c.stdev))});
}
const native = await sharp({create:{width:4096,height:3072,channels:3,background:"#ece9df"}}).composite(composition).png().toBuffer();
const map = await sharp(native).resize(1600,1200).png().toBuffer();
const caption = Buffer.from(`<svg width="1600" height="135"><rect width="1600" height="135" fill="#fff"/><g font-family="sans-serif" fill="#222"><text x="24" y="28" font-size="22">Bologna · Piazza Maggiore · BO-001 procedural proof</text><text x="24" y="54" font-size="18">Partial OSM surface layers; OSM buildings and estimated heights. No municipal geometry or AI painting.</text><text x="24" y="79" font-size="18">Map data © OpenStreetMap contributors · ODbL · openstreetmap.org/copyright</text><text x="24" y="102" font-size="16">© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS</text><text x="24" y="123" font-size="16">by the European Union and ESA; all rights reserved. Terrain: Copernicus DEM GLO-30.</text></g></svg>`);
await sharp({create:{width:1600,height:1335,channels:3,background:"white"}}).composite([{input:map,left:0,top:0},{input:caption,left:0,top:1200}]).jpeg({quality:90}).toFile("docs/bologna-proof.jpg");
const qa = {camera:camera(),tiles:pngs,sceneBins:readdirSync(dir+"scene").length,terrain:{samples:heights.length,nonfinite:0,min:heights.reduce((a,b)=>Math.min(a,b),Infinity),max:heights.reduce((a,b)=>Math.max(a,b),-Infinity)},roundtripMaxHeightErrorM:roundtripMaxM,limitations:["Partial OSM ground: only roads/surface rail and landuse", "No municipal geometry", "Not a building survey or roof/portico reconstruction", "No website/export/traffic QA"]};
writeFileSync("docs/bologna-render-qa.json",JSON.stringify(qa,null,2)+"\n");
console.log("Validated ten color/height tiles and finite terrain; wrote proof and QA JSON");
