/** Independent mesh closure test; subdivides T-junction edges before counting their incidence. */
type V=[number,number,number];
export function meshClosure(positions:number[],buriedBottom:number,tolerance=1e-5){
  const key=(p:V)=>p.map(x=>Math.round(x/tolerance)).join(","),vertices=new Map<string,V>(),triangles:V[][]=[];
  for(let i=0;i<positions.length;i+=9){const t=[positions.slice(i,i+3),positions.slice(i+3,i+6),positions.slice(i+6,i+9)]as V[];triangles.push(t);for(const p of t)vertices.set(key(p),p);}
  const counts=new Map<string,{a:V;b:V;incidence:number}>();
  for(const triangle of triangles)for(let edge=0;edge<3;edge++){
    const a=triangle[edge],b=triangle[(edge+1)%3],d=b.map((x,k)=>x-a[k]),L2=d.reduce((s,x)=>s+x*x,0);if(L2<tolerance**2)continue;
    const points=[...vertices.values()].map(p=>({p,t:p.reduce((s,x,k)=>s+(x-a[k])*d[k],0)/L2})).filter(({p,t})=>t>=-1e-9&&t<=1+1e-9&&Math.hypot(...p.map((x,k)=>x-a[k]-t*d[k]))<=tolerance).sort((x,y)=>x.t-y.t);
    for(let i=0;i<points.length-1;i++){const p=points[i].p,q=points[i+1].p,kp=key(p),kq=key(q);if(kp===kq)continue;const k=[kp,kq].sort().join("/");const record=counts.get(k)??{a:p,b:q,incidence:0};record.incidence++;counts.set(k,record);}
  }
  const exposed=[...counts.values()].filter(e=>!(e.a[2]<=buriedBottom+tolerance&&e.b[2]<=buriedBottom+tolerance));
  return {toleranceM:tolerance,exposedSegments:exposed.length,openSegments:exposed.filter(e=>e.incidence!==2),buriedBottomIntentionallyUncapped:true};
}
