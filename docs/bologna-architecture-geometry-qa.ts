/** Independent convex clipping for projected roof QA; avoids sweep-line ambiguity on shared edges. */
export type P = [number, number];
const cross=(a:P,b:P,c:P)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function triangleIntersectionArea(subject:P[],clip:P[]):number {
  const direction=Math.sign(cross(clip[0],clip[1],clip[2]));if(!direction)return 0;
  let output=subject;
  for(let i=0;i<3&&output.length;i++){
    const a=clip[i],b=clip[(i+1)%3],input=output;output=[];
    for(let j=0;j<input.length;j++){
      const start=input[j],end=input[(j+1)%input.length],ds=cross(a,b,start)*direction,de=cross(a,b,end)*direction,si=ds>=0,ei=de>=0;
      if(si!==ei){const t=ds/(ds-de);output.push([start[0]+t*(end[0]-start[0]),start[1]+t*(end[1]-start[1])]);}
      if(ei)output.push(end);
    }
  }
  if(output.length<3)return 0;
  // Translate before summation to avoid cancellation in ENU coordinates.
  const origin=output[0];let sum=0;for(let i=1;i<output.length-1;i++)sum+=cross(origin,output[i],output[i+1]);
  return Math.abs(sum)/2;
}
