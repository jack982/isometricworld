import { test } from "node:test";
import assert from "node:assert/strict";
import { triangleIntersectionArea, type P } from "./bologna-architecture-geometry-qa.ts";
test("projected roof intersection handles containment, reversed winding and shared edges",()=>{
  const a:P[]=[[0,0],[4,0],[0,4]],inside:P[]=[[0,0],[2,0],[0,2]],touching:P[]=[[0,0],[4,0],[0,-4]];
  assert.equal(triangleIntersectionArea(a,a),8);assert.equal(triangleIntersectionArea(a,inside),2);
  assert.equal(triangleIntersectionArea(a,[...inside].reverse()),2);assert.equal(triangleIntersectionArea(a,touching),0);
});
test("projected roof intersection detects partial overlap and preserves precision far from origin",()=>{
  const a:P[]=[[0,0],[4,0],[0,4]],b:P[]=[[2,0],[6,0],[2,4]],shift=(p:P[])=>p.map(([x,y])=>[x+100000,y-100000]as P);
  assert.equal(triangleIntersectionArea(a,b),2);assert.equal(triangleIntersectionArea(shift(a),shift(b)),2);
  assert.equal(triangleIntersectionArea(a,[[9,9],[10,9],[9,10]]),0);
});
