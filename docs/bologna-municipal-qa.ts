/** Manifest/topology/provenance QA and credited proofs. Visual gate requires deliberate review.
 * node --import tsx docs/bologna-municipal-qa.ts [ctc|ctc-trees] [--visual-reviewed]
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { manifestGrid, validateTile } from "./bologna-coverage-qa.ts";
import { area, bounds, topology, type Polygon } from "../pipeline/src/bologna-geometry.ts";
import { openArea } from "../pipeline/src/areas.ts";
import { camera, ecefToEnu, enuToLlh, llhToEcef, llhToPixel } from "../pipeline/src/camera.ts";
import { municipalCredits } from "../pipeline/src/bologna-credits.ts";
import { groundSampler } from "../pipeline/src/bologna.ts";
const treeStage=process.argv.includes("ctc-trees"),mode=treeStage?"ctc-trees":"ctc",name=treeStage?"trees":"buildings";
const root=`data/bo-002-${name}`,beforeRoot=treeStage?"data/bo-002-buildings":"data/bo-001r",sub="/derived/piazza-maggiore/",dir=root+sub,old=beforeRoot+sub;
const read=(p:string)=>JSON.parse(readFileSync(p,"utf8")),sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const save=(p:string,v:unknown)=>writeFileSync(p,JSON.stringify(v,null,2)+"\n");
openArea("piazza-maggiore");
const before=read(old+"manifest.json"),manifest=read(dir+"manifest.json"),run=read(root+"/run.json"),report=read(root+"/adapter-report.json");
assert.deepEqual(manifest.camera,before.camera);assert.deepEqual(manifest.camera,camera());assert.deepEqual(manifest.tiles,before.tiles);assert.deepEqual(manifest.bbox,before.bbox);assert.equal(manifest.buildingSource,mode);
for(const credit of municipalCredits(mode))assert(manifest.attributions.includes(credit),"municipal attribution absent");
assert(manifest.attributions.some((s:string)=>s.includes("OpenStreetMap")));assert(manifest.attributions.some((s:string)=>s.includes("Copernicus")));
const preservation=read(root+"/preservation.json");for(const [p,h]of Object.entries(preservation.baseline))assert.equal(sha(p),h,`BO-001R artifact changed: ${p}`);
const original=read("docs/bologna-coverage-preservation.json");let originals=0;
for(const [p,v]of Object.entries(original)as[string,{sha256:string}][]){if(p==="pipeline/src/places.ts")continue;assert.equal(sha(p),v.sha256,`BO-001 artifact changed: ${p}`);originals++;}
const grid=manifestGrid(manifest.tiles),W=(grid.maxX-grid.minX+1)*1024,H=(grid.maxY-grid.minY+1)*1024;
const pixels=new Map<string,Buffer>(),tiles:any[]=[],composition:any[]=[],priorComposition:any[]=[];
for(const {x,y}of manifest.tiles){const key=`${x}_${y}`,p=dir+`render/${key}.png`,h=dir+`height/${key}.png`,current=await validateTile(p,1024),height=await validateTile(h,256),prior=await validateTile(old+`render/${key}.png`,1024);let diff=0,changed=0;
  for(let i=0;i<current.data.length;i+=4){let d=0;for(let c=0;c<3;c++)d+=Math.abs(current.data[i+c]-prior.data[i+c]);diff+=d;if(d>9)changed++;}
  tiles.push({x,y,colorSha256:sha(p),heightSha256:sha(h),minAlpha:current.minAlpha,heightMinAlpha:height.minAlpha,meanRgbDifference:diff/(1024*1024*3),changedPixelFraction:changed/(1024*1024)});pixels.set(key,current.data);
  composition.push({input:p,left:(x-grid.minX)*1024,top:(y-grid.minY)*1024});priorComposition.push({input:old+`render/${key}.png`,left:(x-grid.minX)*1024,top:(y-grid.minY)*1024});
}
const seams:any[]=[];
for(const {x,y}of manifest.tiles)for(const [dx,dy]of [[1,0],[0,1]]){const a=pixels.get(`${x}_${y}`)!,b=pixels.get(`${x+dx}_${y+dy}`);if(!b)continue;let edge=0,control=0;
  const delta=(p:Buffer,i:number,q:Buffer,j:number)=>[0,1,2].reduce((s,c)=>s+Math.abs(p[i+c]-q[j+c]),0)/3;
  for(let k=0;k<1024;k++){const i=(dx?k*1024+1023:1023*1024+k)*4,j=(dx?k*1024:k)*4,step=dx?4:4096;edge+=delta(a,i,b,j);control+=(delta(a,i,a,i-step)+delta(b,j,b,j+step))/2;}
  edge/=1024;control/=1024;seams.push({from:[x,y],to:[x+dx,y+dy],edgeMae:edge,adjacentInteriorMae:control,review:edge>Math.max(12,control*3)});
}
assert.equal(seams.length,13);
const volumes=read(root+"/raw/piazza-maggiore/municipal-buildings.json"),invalidGenerated:any[]=[];
for(const v of volumes){const reason=topology(v.poly);if(reason)invalidGenerated.push({id:v.id,reason,source:v.source});}
const holes=volumes.reduce((s:number,v:any)=>s+v.poly.length-1,0);
const groundSame=sha(dir+"ground/height.bin")===sha("data/bo-001r"+sub+"ground/height.bin")&&sha(dir+"ground/features.json")===sha("data/bo-001r"+sub+"ground/features.json");assert(groundSame,"ground input changed");
const buildingsSameAsStageA=!treeStage||sha(root+"/raw/piazza-maggiore/municipal-buildings.json")===sha("data/bo-002-buildings/raw/piazza-maggiore/municipal-buildings.json");assert(buildingsSameAsStageA,"tree stage changed buildings");
const gb=readFileSync(dir+"ground/height.bin"),g=groundSampler(read(dir+"ground/meta.json"),new Float32Array(gb.buffer,gb.byteOffset,gb.length/4));
const native=await sharp({create:{width:W,height:H,channels:3,background:"#ece9df"}}).composite(composition).png().toBuffer(),priorNative=await sharp({create:{width:W,height:H,channels:3,background:"#ece9df"}}).composite(priorComposition).png().toBuffer();
const caption=(title:string)=>Buffer.from(`<svg width="1600" height="230"><rect width="1600" height="230" fill="white"/><g font-family="sans-serif" fill="#222"><text x="20" y="28" font-size="22">${title}</text><text x="20" y="53" font-size="16">Procedural approximation: flat eave roofs, generic facades. Two beige top corners are outside the manifest.</text><text x="20" y="78" font-size="16">© OpenStreetMap contributors · ODbL · https://www.openstreetmap.org/copyright</text><text x="20" y="103" font-size="16">Comune di Bologna – SIT · CTC Edifici volumetrici · CC BY 4.0 · projected, filtered, reconciled and extruded</text><text x="20" y="125" font-size="14">https://opendata.comune.bologna.it/explore/dataset/c_a944ctc_edifici_pl/ · https://creativecommons.org/licenses/by/4.0/</text>${treeStage?'<text x="20" y="147" font-size="14">Comune di Bologna – Settore Ambiente e Verde · CC BY 4.0 · class-based height/radius estimates and deduplication</text><text x="20" y="167" font-size="13">https://opendata.comune.bologna.it/explore/dataset/alberi-manutenzioni/ · https://creativecommons.org/licenses/by/4.0/</text>':''}<text x="20" y="193" font-size="14">© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS</text><text x="20" y="215" font-size="14">by the European Union and ESA; all rights reserved. Terrain: Copernicus DEM GLO-30.</text></g></svg>`);
const proofPath=`docs/bologna-municipal-${name}-proof.jpg`,comparisonPath=`docs/bologna-${name}-comparison.jpg`;
await sharp({create:{width:1600,height:1430,channels:3,background:"white"}}).composite([{input:await sharp(native).resize(1600,1200).png().toBuffer(),left:0,top:0},{input:caption(`Bologna · BO-002 ${name} · municipal geometry`),left:0,top:1200}]).jpeg({quality:90}).toFile(proofPath);
const comparison=[{input:await sharp(old+"render/-1_-1.png").resize(800,800).png().toBuffer(),left:0,top:35},{input:await sharp(dir+"render/-1_-1.png").resize(800,800).png().toBuffer(),left:800,top:35},{input:Buffer.from(`<svg width="1600" height="35"><rect width="1600" height="35" fill="white"/><g font-family="sans-serif" font-size="22"><text x="20" y="26">Before: ${treeStage?'municipal buildings':'OSM-only BO-001R'}</text><text x="820" y="26">After: municipal ${name}</text></g></svg>`),left:0,top:0},{input:caption(`Same central tile (-1,-1) · frozen camera and ground`),left:0,top:835}];
await sharp({create:{width:1600,height:1065,channels:3,background:"white"}}).composite(comparison).jpeg({quality:90}).toFile(comparisonPath);
const osm=read("data/bo-001r/raw/piazza-maggiore/osm.json").elements;
const landmarkPoints=[{name:"Piazza Maggiore",lat:44.4938,lon:11.343},{name:"Piazza Nettuno",lat:44.49428,lon:11.34265},...osm.filter((e:any)=>["Basilica di San Petronio","Palazzo d'Accursio"].includes(e.tags?.name)).map((e:any)=>({name:e.tags.name,lat:e.geometry.reduce((s:number,p:any)=>s+p.lat,0)/e.geometry.length,lon:e.geometry.reduce((s:number,p:any)=>s+p.lon,0)/e.geometry.length}))];
const court=volumes.find((v:any)=>v.source==="ctc"&&v.poly.length>1&&area([v.poly])>200);
if(court){const b=bounds(court.poly),q=enuToLlh([(b[0]+b[2])/2,(b[1]+b[3])/2,0]);landmarkPoints.push({name:`Courtyard ${court.id}`,lat:q[0],lon:q[1]});}
const landmarkCrops:any[]=[],landmarks:any[]=[];
for(const [i,p]of landmarkPoints.entries()){
  const enu=ecefToEnu(llhToEcef(p.lat,p.lon,0)),ground=g(enu[0],enu[1]),pixel=llhToPixel(p.lat,p.lon,ground),cx=pixel[0]-grid.minX*1024,cy=pixel[1]-grid.minY*1024;
  const left=Math.max(0,Math.min(W-640,Math.round(cx-320))),top=Math.max(0,Math.min(H-480,Math.round(cy-240)));
  landmarks.push({...p,ground,pixel,crop:{left,top,width:640,height:480}});
  landmarkCrops.push({input:Buffer.from(`<svg width="1280" height="32"><rect width="1280" height="32" fill="white"/><text x="15" y="24" font-family="sans-serif" font-size="18">${p.name.replace(/&/g,'&amp;')} · before (left), after (right)</text></svg>`),left:0,top:i*512});
  for(const [j,img]of [priorNative,native].entries())landmarkCrops.push({input:await sharp(img).extract({left,top,width:640,height:480}).png().toBuffer(),left:j*640,top:i*512+32});
}
const landmarkPath=`docs/bologna-municipal-${name}-landmarks.jpg`;
await sharp({create:{width:1600,height:landmarkPoints.length*512+230,channels:3,background:"white"}}).composite([...landmarkCrops,{input:caption("Landmark / courtyard QA crops; roofs and porticoes remain approximations"),left:0,top:landmarkPoints.length*512}]).jpeg({quality:88}).toFile(landmarkPath);
const osmCheck=read("data/bo-002-osm-check"+sub+"manifest.json");
const osmRegression=manifest.tiles.map(({x,y}:any)=>({x,y,colorUnchanged:sha(`data/bo-002-osm-check${sub}render/${x}_${y}.png`)===sha(`data/bo-001r${sub}render/${x}_${y}.png`),heightUnchanged:sha(`data/bo-002-osm-check${sub}height/${x}_${y}.png`)===sha(`data/bo-001r${sub}height/${x}_${y}.png`)}));
assert.deepEqual(osmCheck.camera,before.camera);assert(osmRegression.every((t:any)=>t.colorUnchanged&&t.heightUnchanged),"OSM renderer regression");
const seriousFloating=report.terrain.filter((t:any)=>t.floatingGapM>.5),automatedPassed=invalidGenerated.length===0&&report.counts.duplicatePairs===0&&holes>0&&seriousFloating.length===0&&buildingsSameAsStageA;
const visualReviewed=process.argv.includes("--visual-reviewed"),passed=automatedPassed&&visualReviewed;
const qa={stage:mode,stageAPassed:treeStage?read("docs/bologna-municipal-qa.json").stageAPassed:passed,stageBPassed:treeStage?passed:undefined,automatedPassed,visualReviewed,expectedTiles:manifest.tiles.length,validTiles:tiles.length,missingExpectedTiles:[],intentionalBlankCells:grid.intentionalBlankCells,sharedBoundaries:seams,tiles,counts:report.counts,heightCounts:report.heightCounts,topology:{invalidGenerated,holes,duplicatePairs:report.counts.duplicatePairs,maxOverlapM2:report.counts.maxOverlapM2,ctcOverlapCorrections:report.overlaps.length,osmOverlapCorrections:report.osmOverlapCorrections.length,droppedResidualSlivers:report.slivers.length},terrain:{sameBaselineGround:groundSame,seriousFloating,slopeWarnings:report.terrain.filter((t:any)=>t.slopeWarning),policy:report.policy.anchor,absoluteCtcDatumUsed:false},sourceSnapshots:run.municipalSnapshots,preservation:{baselineArtifacts:Object.keys(preservation.baseline).length,originalInventoryUnchanged:originals,originalInventoryCodeExceptions:[{path:"pipeline/src/places.ts",reason:"conditional municipal credits only; frozen camera verified"}]},osmRegression,landmarks,trees:report.trees?{selected:report.trees.selected,osmMatched:report.trees.osmMatched,osmRetained:report.trees.osmRetained,total:report.trees.total}:undefined,proofs:{proof:proofPath,proofSha256:sha(proofPath),comparison:comparisonPath,comparisonSha256:sha(comparisonPath),landmarks:landmarkPath},fullDiagnostics:root+"/adapter-report.json",limitations:["Generic facade patterns and flat eave roofs; no portico clearance or monumental sculpture","Relative eave heights only; absolute CTC vertical datum unresolved","Shadow texture uses outer footprint; courtyard roof holes remain geometrically open","1 mm boolean precision; sub-0.5m² residuals explicitly dropped","Slope diagnostics flag embedding risks; this is not a survey certification"]};
Object.assign(qa,{buildingsSameAsStageA,fullDiagnosticsSha256:sha(root+"/adapter-report.json"),courtyardExclusions:report.courtyardExclusions.length,sliverAreaM2:report.slivers.reduce((s:number,v:any)=>s+v.area,0),generatedQuarantined:report.generatedQuarantine});
if(report.trees)Object.assign(qa.trees!,{
  heightEstimatesM:{"<6":4,"6–12":9,"12–16":14,"16–23":19.5,">23":26},
  radiusPolicy:"clamp(0.22 * class-estimated height, 1.5, 5) m; generic estimate, not a canopy measurement",
  dedupeToleranceM:report.trees.dedupeToleranceM,
  sourceFreshness:{missingSpecies:report.trees.points.filter((p:any)=>!p.properties.classe).length,missingPlantingDate:report.trees.points.filter((p:any)=>!p.properties.data_impnt).length,missingUpdateDate:report.trees.points.filter((p:any)=>!p.properties.data_agg).length,updatedBefore2010:report.trees.points.filter((p:any)=>p.properties.data_agg&&p.properties.data_agg<"2010").length},
});
save(treeStage?"docs/bologna-municipal-trees-qa.json":"docs/bologna-municipal-qa.json",qa);
console.log({stage:mode,automatedPassed,visualReviewed,passed,invalidGenerated:invalidGenerated.length,duplicates:report.counts.duplicatePairs,seriousFloating:seriousFloating.length,tiles:tiles.length});
