/** BO-001R manifest-driven tile validation, preservation checks, seams and credited comparison.
 * node --import tsx docs/bologna-coverage-qa.ts
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { areaTiles, openArea } from "../pipeline/src/areas.ts";

const read=(p:string)=>JSON.parse(readFileSync(p,"utf8"));
const sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
export function manifestGrid(tiles:{x:number;y:number}[]) {
  assert(tiles.length>0,"empty manifest");
  const keys=new Set(tiles.map(t=>`${t.x},${t.y}`));
  assert.equal(keys.size,tiles.length,"duplicate manifest coordinate");
  for(const t of tiles)assert(Number.isInteger(t.x)&&Number.isInteger(t.y),"invalid tile coordinate");
  const minX=Math.min(...tiles.map(t=>t.x)),maxX=Math.max(...tiles.map(t=>t.x)),minY=Math.min(...tiles.map(t=>t.y)),maxY=Math.max(...tiles.map(t=>t.y));
  const intentionalBlankCells=[];
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(!keys.has(`${x},${y}`))intentionalBlankCells.push({x,y});
  return {minX,maxX,minY,maxY,intentionalBlankCells};
}
export async function validateTile(input:string|Buffer,size:number) {
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,size,"tile width");assert.equal(info.height,size,"tile height");
  let minAlpha=255,maxAlpha=0,min=255,max=0;
  for(let i=0;i<data.length;i+=4){minAlpha=Math.min(minAlpha,data[i+3]);maxAlpha=Math.max(maxAlpha,data[i+3]);for(let c=0;c<3;c++){min=Math.min(min,data[i+c]);max=Math.max(max,data[i+c]);}}
  assert.equal(minAlpha,255,"transparent pixels in expected tile");
  const stats=await sharp(input).stats();
  assert(stats.channels.slice(0,3).some(c=>c.stdev>=1),"blank expected tile");
  return {data,info,minAlpha,maxAlpha,min,max,minChannelStdev:Math.min(...stats.channels.slice(0,3).map(c=>c.stdev))};
}

async function main(){
  const old="data/derived/piazza-maggiore/",dir="data/bo-001r/derived/piazza-maggiore/";
  const before=read(old+"manifest.json"),after=read(dir+"manifest.json");
  assert.deepEqual(after.camera,before.camera,"frozen camera changed");assert.deepEqual(after.bbox,before.bbox,"bbox changed");assert.deepEqual(after.tiles,before.tiles,"manifest tiles changed");
  const area=openArea("piazza-maggiore");assert.deepEqual(after.tiles.map((t:any)=>[t.x,t.y]),areaTiles(area.bbox));
  const grid=manifestGrid(after.tiles),W=(grid.maxX-grid.minX+1)*1024,H=(grid.maxY-grid.minY+1)*1024;
  const preserved=read("docs/bologna-coverage-preservation.json");
  for(const [p,entry] of Object.entries(preserved) as [string,{bytes:number;sha256:string}][]) {assert.equal(statSync(p).size,entry.bytes,`size changed: ${p}`);assert.equal(sha(p),entry.sha256,`preserved data changed: ${p}`);}
  const reportTiles=[],rgba=new Map<string,Buffer>(),oldRgba=new Map<string,Buffer>(),composition=[];
  for(const {x,y} of after.tiles){
    const key=`${x}_${y}`,file=dir+`render/${key}.png`,heightFile=dir+`height/${key}.png`;
    const current=await validateTile(file,1024),height=await validateTile(heightFile,256),prior=await validateTile(old+`render/${key}.png`,1024);
    let changed=0,absolute=0;
    for(let i=0;i<current.data.length;i+=4){let delta=0;for(let c=0;c<3;c++){delta+=Math.abs(current.data[i+c]-prior.data[i+c]);}absolute+=delta;if(delta>9)changed++;}
    reportTiles.push({x,y,colorSha256:sha(file),heightSha256:sha(heightFile),minAlpha:current.minAlpha,heightMinAlpha:height.minAlpha,minChannelStdev:current.minChannelStdev,heightChannelStdev:height.minChannelStdev,changedPixelFraction:changed/(1024*1024),meanAbsoluteRgbChange:absolute/(1024*1024*3)});
    rgba.set(key,current.data);oldRgba.set(key,prior.data);
    composition.push({input:file,left:(x-grid.minX)*1024,top:(y-grid.minY)*1024});
  }
  const seams=[];
  const edge=(a:Buffer,b:Buffer,vertical:boolean)=>{
    let seam=0,control=0;
    const delta=(p:Buffer,i:number,q:Buffer,j:number)=>[0,1,2].reduce((s,c)=>s+Math.abs(p[i+c]-q[j+c]),0)/3;
    for(let k=0;k<1024;k++){
      const i=(vertical?k*1024+1023:1023*1024+k)*4,j=(vertical?k*1024:k)*4,step=vertical?4:4096;
      seam+=delta(a,i,b,j);control+=(delta(a,i,a,i-step)+delta(b,j,b,j+step))/2;
    }
    return {edgeMae:seam/1024,adjacentInteriorMae:control/1024};
  };
  for(const {x,y} of after.tiles)for(const [dx,dy] of [[1,0],[0,1]]){
    const key=`${x}_${y}`,next=`${x+dx}_${y+dy}`;if(!rgba.has(next))continue;
    const current=edge(rgba.get(key)!,rgba.get(next)!,dx===1),prior=edge(oldRgba.get(key)!,oldRgba.get(next)!,dx===1);
    seams.push({from:[x,y],to:[x+dx,y+dy],before:prior,after:current,review:current.edgeMae>Math.max(12,current.adjacentInteriorMae*3)?"inspect":"no-large-color-jump"});
  }
  const native=await sharp({create:{width:W,height:H,channels:3,background:"#ece9df"}}).composite(composition).png().toBuffer();
  const map=await sharp(native).resize(1600,1200).png().toBuffer();
  const credit=(heading:string,detail:string)=>Buffer.from(`<svg width="1600" height="135"><rect width="1600" height="135" fill="#fff"/><g font-family="sans-serif" fill="#222"><text x="24" y="28" font-size="22">${heading}</text><text x="24" y="54" font-size="18">${detail}</text><text x="24" y="79" font-size="18">Map data © OpenStreetMap contributors · ODbL · openstreetmap.org/copyright</text><text x="24" y="102" font-size="16">© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS</text><text x="24" y="123" font-size="16">by the European Union and ESA; all rights reserved. Terrain: Copernicus DEM GLO-30.</text></g></svg>`);
  await sharp({create:{width:1600,height:1335,channels:3,background:"white"}}).composite([{input:map,left:0,top:0},{input:credit("Bologna · Piazza Maggiore · BO-001R surface coverage","Local OSM surface extract · ten expected tiles · beige top corners are outside the tile manifest"),left:0,top:1200}]).jpeg({quality:90}).toFile("docs/bologna-proof-coverage.jpg");
  const comparison=[];
  for(const [i,path] of [old,dir].entries())comparison.push({input:await sharp(path+"render/-1_-1.png").resize(800,800).png().toBuffer(),left:i*800,top:35});
  const labels=Buffer.from(`<svg width="1600" height="35"><rect width="1600" height="35" fill="#fff"/><g font-family="sans-serif" font-size="22"><text x="24" y="26">Before: partial Overpass surfaces</text><text x="824" y="26">After: complete local surface selection</text></g></svg>`);
  await sharp({create:{width:1600,height:970,channels:3,background:"white"}}).composite([...comparison,{input:labels,left:0,top:0},{input:credit("BO-001 → BO-001R · same central tile (-1,-1)","Buildings, trees, DEM, camera and render settings held constant; surface selection changed."),left:0,top:835}]).jpeg({quality:90}).toFile("docs/bologna-coverage-comparison.jpg");
  const kinds=(p:string)=>{const result:Record<string,number>={};for(const f of read(p))result[f.k]=(result[f.k]??0)+1;return result;};
  const featuresBefore=kinds(old+"ground/features.json"),featuresAfter=kinds(dir+"ground/features.json");
  const beforeTerrain=sha(old+"ground/height.bin"),afterTerrain=sha(dir+"ground/height.bin");
  const meta=read(dir+"ground/meta.json"),buf=readFileSync(dir+"ground/height.bin"),heights=new Float32Array(buf.buffer,buf.byteOffset,buf.length/4);
  assert.equal(heights.length,meta.nx*meta.ny);assert(heights.every(Number.isFinite));
  const qa={expectedTiles:after.tiles.length,validTiles:reportTiles.length,compositionCells:W/1024*H/1024,intentionalBlankCells:grid.intentionalBlankCells,missingExpectedTiles:[],preservedFiles:Object.keys(preserved).length,frozenCameraUnchanged:true,tiles:reportTiles,seams,features:{before:featuresBefore,after:featuresAfter},terrain:{finite:true,samples:heights.length,beforeSha256:beforeTerrain,afterSha256:afterTerrain,identical:beforeTerrain===afterTerrain},sceneBins:{before:readdirSync(old+"scene").length,after:readdirSync(dir+"scene").length},proof:{sha256:sha("docs/bologna-proof-coverage.jpg"),comparisonSha256:sha("docs/bologna-coverage-comparison.jpg")}};
  writeFileSync("docs/bologna-coverage-qa.json",JSON.stringify(qa,null,2)+"\n");
  console.log({expected:qa.expectedTiles,valid:qa.validTiles,intentionalBlankCells:qa.intentionalBlankCells,preserved:qa.preservedFiles,seamsToInspect:seams.filter(s=>s.review==="inspect").length});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
