import { resolve, sep } from 'node:path';

/** Shared by dev middleware and tests. The override is relative to the repo, never the shell cwd. */
export function mapCache(root:string|undefined, repoRoot:string) {
  return resolve(repoRoot, root || 'data/web') + sep;
}

/** Resolve a mounted /regions/ request without allowing encoded traversal or malformed URLs. */
export function regionAsset(cache:string, requestUrl:string|undefined) {
  let path:string;
  try { path = decodeURIComponent((requestUrl ?? '/').split('?')[0]); } catch { return null; }
  if (path.includes('\\') || path.includes('\0') || path.split('/').some(p => p === '..' || p === '.')) return null;
  const parent = resolve(cache, 'regions') + sep, file = resolve(parent, '.' + path);
  return file.startsWith(parent) ? file : null;
}
