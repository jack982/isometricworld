/** Deterministic diagnostic measurements only; no transport, process or painting dependency. */
import assert from "node:assert/strict";
import sharp from "sharp";
export interface Point { x: number; y: number }
export interface Pair { source: Point; target: Point; id: string }
export function percentile(v: number[], q: number) { if (!v.length) return null; const s = v.slice().sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor((s.length-1)*q))]; }
export function correlation(a: number[], b: number[]) {
  assert.equal(a.length,b.length); if (!a.length) return 0;
  const ma=a.reduce((s,x)=>s+x,0)/a.length, mb=b.reduce((s,x)=>s+x,0)/b.length;
  let c=0,va=0,vb=0; for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;c+=x*y;va+=x*x;vb+=y*y;} return c/Math.sqrt(va*vb+1e-9);
}
export async function inspectImage(b: Buffer) {
  const m=await sharp(b).metadata(), {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let alphaMin=255,blackPixels=0;for(let k=0;k<data.length;k+=4){alphaMin=Math.min(alphaMin,data[k+3]);if(Math.max(data[k],data[k+1],data[k+2])<15)blackPixels++;}
  const grid=await sharp(b).removeAlpha().resize(8,8).raw().toBuffer();let darkCells=0;for(let k=0;k<64;k++)if((grid[k*3]+grid[k*3+1]+grid[k*3+2])/3<15)darkCells++;
  return {format:m.format,width:m.width,height:m.height,channels:m.channels,space:m.space,depth:m.depth,hasAlpha:m.hasAlpha,alphaMin,hasProfile:m.hasProfile,iccBytes:m.icc?.length??0,orientation:m.orientation??null,blackPixels,darkCells,validOpaquePng:m.format==="png"&&alphaMin===255&&darkCells===0,pixels:info.width*info.height};
}
export async function normalized(b: Buffer) { const m=await sharp(b).metadata();assert.equal(m.width,m.height,"SQUARE_ONLY_NO_CROP");return sharp(b).resize(1024,1024,{kernel:"lanczos3",fit:"fill"}).png().toBuffer(); }
export async function paddingEvidence(b: Buffer) {
  const {data,info}=await sharp(b).removeAlpha().raw().toBuffer({resolveWithObject:true}); const w=info.width,h=info.height,c=info.channels;
  const bands = [ ["top",0,0,w,Math.max(1,Math.round(h*.03))], ["bottom",0,h-Math.max(1,Math.round(h*.03)),w,Math.max(1,Math.round(h*.03))], ["left",0,0,Math.max(1,Math.round(w*.03)),h], ["right",w-Math.max(1,Math.round(w*.03)),0,Math.max(1,Math.round(w*.03)),h] ] as const;
  const result=bands.map(([side,x,y,bw,bh])=>{let sum=0,sum2=0,n=0,contrasts=0;for(let j=y;j<y+bh;j++)for(let i=x;i<x+bw;i++){const k=(j*w+i)*c,v=(data[k]+data[k+1]+data[k+2])/3;sum+=v;sum2+=v*v;n++;if(i>x&&Math.abs(v-(data[k-c]+data[k-c+1]+data[k-c+2])/3)>15)contrasts++;}return{side,stdev:Math.sqrt(Math.max(0,sum2/n-(sum/n)**2)),contrastFraction:contrasts/n};});
  return {bands:result,constantBorderSupported:result.every(s=>s.stdev<2),cropTrialJustified:result.every(s=>s.stdev<2),limitation:"3% edge bands test only constant padding; textured padding or small framing loss is not excluded"};
}
export async function edges(b: Buffer,size=256) {
  const gray=await sharp(b).removeAlpha().resize(size,size).greyscale().blur(.8).raw().toBuffer(), out=new Float32Array(size*size);
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){const k=y*size+x;const dx=gray[k+1-size]+2*gray[k+1]+gray[k+1+size]-gray[k-1-size]-2*gray[k-1]-gray[k-1+size],dy=gray[k+size-1]+2*gray[k+size]+gray[k+size+1]-gray[k-size-1]-2*gray[k-size]-gray[k-size+1];out[k]=Math.hypot(dx,dy);} return out;
}
export function sampledCorrelation(a: Float32Array,b: Float32Array,n: number,s=1,tx=0,ty=0,box=[12,12,n-24,n-24],stride=2) {
  const aa:number[]=[],bb:number[]=[];for(let y=box[1];y<box[1]+box[3];y+=stride)for(let x=box[0];x<box[0]+box[2];x+=stride){const u=Math.round((x-n/2)*s+n/2+tx),v=Math.round((y-n/2)*s+n/2+ty);if(u>0&&v>0&&u<n-1&&v<n-1){aa.push(a[y*n+x]);bb.push(b[v*n+u]);}} return correlation(aa,bb);
}
export function globalSearch(a:Float32Array,b:Float32Array,n=256) {
  let best={scale:1,tx:0,ty:0,score:-2};for(let si=-6;si<=6;si++)for(let ty=-6;ty<=6;ty+=2)for(let tx=-6;tx<=6;tx+=2){const scale=1+si*.01,score=sampledCorrelation(a,b,n,scale,tx,ty,undefined,4);if(score>best.score+1e-12||(Math.abs(score-best.score)<=1e-12&&Math.abs(scale-1)<Math.abs(best.scale-1)))best={scale,tx,ty,score};}
  return {...best,txInputPixels:best.tx*1024/n,tyInputPixels:best.ty*1024/n,meaning:"Exploratory edge fit, not accepted registration; rounded sampling; no pixels transformed by this fit"};
}
export function fitGlobal(pairs: Pair[]) {
  if(pairs.length<3)return{status:"UNCERTAIN",reason:"MISSING_CONTROL_POINT_EVIDENCE",count:pairs.length};
  const mean=(key:"source"|"target",axis:"x"|"y")=>pairs.reduce((s,p)=>s+p[key][axis],0)/pairs.length;
  const sx=mean("source","x"),sy=mean("source","y"),tx=mean("target","x"),ty=mean("target","y");let cov=0,varr=0;
  for(const p of pairs){cov+=(p.source.x-sx)*(p.target.x-tx)+(p.source.y-sy)*(p.target.y-ty);varr+=(p.source.x-sx)**2+(p.source.y-sy)**2;}
  if(varr<1)return{status:"UNCERTAIN",reason:"DEGENERATE_CONTROLS",count:pairs.length};
  const scale=cov/varr,dx=tx-scale*sx,dy=ty-scale*sy;
  const residuals=pairs.map(p=>({...p,distance:Math.hypot(scale*p.source.x+dx-p.target.x,scale*p.source.y+dy-p.target.y),quadrant:(p.source.y<512?"N":"S")+(p.source.x<512?"W":"E")}));
  const d=residuals.map(r=>r.distance);return{status:Math.max(...d)>6?"FAIL":"UNCERTAIN",scale,dx,dy,count:pairs.length,median:percentile(d,.5),p95:percentile(d,.95),worst:Math.max(...d),residuals,meaning:"Input-pixel residuals of proposed texture matches, not surveyed controls; <=6 px does not certify fidelity"};
}
export function localProposals(a:Float32Array,b:Float32Array,n=256) {
  const proposals=[];for(const y of [36,80,128,176,220])for(const x of [36,80,128,176,220]){
    const values=[];for(let dy=-10;dy<=10;dy++)for(let dx=-10;dx<=10;dx++)values.push({dx,dy,score:sampledCorrelation(a,b,n,1,dx,dy,[x-10,y-10,21,21],2)});
    values.sort((p,q)=>q.score-p.score);const best=values[0],runner=values.find(v=>Math.hypot(v.dx-best.dx,v.dy-best.dy)>3)!;
    proposals.push({id:`patch-${x}-${y}`,source:{x:x*4,y:y*4},target:{x:(x+best.dx)*4,y:(y+best.dy)*4},score:best.score,peakMargin:best.score-runner.score,eligible:best.score>=.65&&best.score-runner.score>=.06,authoritative:false});
  }return proposals;
}
export function decision(format:boolean,alignment:string,topology:string,blocking=false) {
  return {decision:!format||blocking?"REJECT_CANDIDATE":alignment==="PASS"&&topology==="PASS"?"RECOVERABLE_FOR_OFFLINE_TEST":"REFINE_REQUIRED",format:format?"FORMAT_RECOVERABLE":"FORMAT_BLOCKED",alignment,topology,humanAcceptance:"PENDING",humanGate:"HUMAN_ACCEPTANCE_REQUIRED",seams:"NOT_TESTED",scalability:"NOT_TESTED",cost:"NOT_TESTED",registrationPermitted:false};
}
