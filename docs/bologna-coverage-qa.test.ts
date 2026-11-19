import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { manifestGrid, validateTile } from "./bologna-coverage-qa.ts";
test("manifest excludes two intentional corner cells, rejects duplicate/empty coordinates",()=>{
  const tiles=[{x:-1,y:-2},{x:0,y:-2},...[-1,0].flatMap(y=>[-2,-1,0,1].map(x=>({x,y})))];
  assert.deepEqual(manifestGrid(tiles).intentionalBlankCells,[{x:-2,y:-2},{x:1,y:-2}]);
  assert.throws(()=>manifestGrid([]));assert.throws(()=>manifestGrid([...tiles,tiles[0]]));
});
test("tile QA rejects blank, transparent, missing and wrong-size expected tiles",async()=>{
  const blank=await sharp({create:{width:4,height:4,channels:4,background:{r:100,g:100,b:100,alpha:1}}}).png().toBuffer();
  await assert.rejects(validateTile(blank,4),/blank/);
  const pixels=Buffer.from(Array.from({length:16},(_,i)=>[i*15,255-i*10,i*5,255]).flat());
  const good=await sharp(pixels,{raw:{width:4,height:4,channels:4}}).png().toBuffer();
  assert.equal((await validateTile(good,4)).minAlpha,255);
  await assert.rejects(validateTile(good,5),/width/);
  pixels[3]=0;
  const transparent=await sharp(pixels,{raw:{width:4,height:4,channels:4}}).png().toBuffer();
  await assert.rejects(validateTile(transparent,4),/transparent/);
  await assert.rejects(validateTile("/tmp/bo-001r-deliberately-missing.png",4));
});
test("data-root override preserves default region paths and isolates an explicit run",()=>{
  const code='import {DATA,RAW,DERIVED,ROOT} from "./pipeline/src/paths.ts";console.log(JSON.stringify({DATA,RAW,DERIVED,ROOT}));';
  const paths=(root:string)=>JSON.parse(execFileSync(process.execPath,["--import","tsx","--input-type=module","-e",code],{env:{...process.env,PIPELINE_DATA_ROOT:root}}).toString());
  const standard=paths("");
  assert.equal(standard.DATA,resolve("data"));assert.equal(standard.RAW,resolve("data/raw"));assert.equal(standard.DERIVED,resolve("data/derived"));
  const isolated=paths("data/bo-001r");
  assert.equal(isolated.DATA,resolve("data/bo-001r"));assert.equal(isolated.RAW,resolve("data/bo-001r/raw"));assert.equal(isolated.DERIVED,resolve("data/bo-001r/derived"));assert.equal(isolated.ROOT,standard.ROOT);
});
