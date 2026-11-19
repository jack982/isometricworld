import { resolve, sep } from "node:path";

/** A complete, static, network-free local preview; normal exports retain their existing behavior. */
export function exportMode(args:string[],dataRoot:string|undefined,cache:string,publishedState:string){
  const localPreview=args.includes("--local-preview");
  if(localPreview){
    if(!dataRoot||resolve(dataRoot)===resolve("data"))throw Error("Local preview requires an isolated PIPELINE_DATA_ROOT");
    const root=resolve(dataRoot)+sep;
    if(!resolve(cache).startsWith(root)||!resolve(publishedState).startsWith(root))throw Error("Local preview cache/state must stay inside its isolated data root");
    if(args.includes("--data-only"))throw Error("Local preview requires a complete tile pyramid, not --data-only");
  }
  return {localPreview,fadeEdges:!localPreview,animations:!localPreview,remoteFallback:!localPreview};
}
