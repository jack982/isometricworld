import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { exportMode } from "../pipeline/src/export-mode.ts";
import { mapCache, regionAsset } from "../web/local-map.ts";
test("normal export keeps fading, animation data and remote fallback",()=>{
  assert.deepEqual(exportMode([],undefined,"data/web","data/web-state"),{localPreview:false,fadeEdges:true,animations:true,remoteFallback:true});
});
test("local preview is static and cannot use default/shared cache or published state",()=>{
  const root="data/bo-005p-viewer",m=exportMode(["--local-preview"],root,root+"/web",root+"/web-state");assert.deepEqual(m,{localPreview:true,fadeEdges:false,animations:false,remoteFallback:false});
  for(const [r,c,s]of [[undefined,"data/web","data/web-state"],["data","data/web","data/web-state"],[root,"data/web",root+"/web-state"],[root,root+"/web","data/web-state"]])assert.throws(()=>exportMode(["--local-preview"],r,c!,s!));
  assert.throws(()=>exportMode(["--local-preview","--data-only"],root,root+"/web",root+"/web-state"));
});
test("dev override is portable, root-relative and leaves normal cache path unchanged",()=>{
  assert.equal(mapCache(undefined,"/repo"),"/repo/data/web/");assert.equal(mapCache("data/bo-005p-viewer/web","/repo"),"/repo/data/bo-005p-viewer/web/");assert.equal(mapCache("/tmp/viewer","/repo"),"/tmp/viewer/");
});
test("region middleware resolves signed tile indices and rejects encoded traversal",()=>{
  const root="/repo/data/bo-005p-viewer/web/";
  assert.equal(regionAsset(root,"/bologna/tiles/map/8/-2/-1.avif?v=abc"),resolve(root,"regions/bologna/tiles/map/8/-2/-1.avif"));
  for(const path of ["/../.env","/%2e%2e/.env","/%00.json","/%ZZ","/bologna/..\\.env","/bologna/./data/world.json"])assert.equal(regionAsset(root,path),null);
});
