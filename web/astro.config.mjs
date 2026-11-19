// @ts-check
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { HOSTING } from '../pipeline/src/hosting.ts';
import { CITIES } from '../pipeline/src/places.ts';
import { mapCache, regionAsset } from './local-map.ts';

// hosting settings (TILES_ORIGIN, SITE_DOMAIN) live in the repo-root .env, never in git
const ENV = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(ENV)) process.loadEnvFile(ENV);

/**
 * Map data is not in web/public. In dev, /regions/* is served from the export cache
 * (data/web/regions: what `npm run export` built and `npm run publish` has not uploaded yet), and
 * everything else is proxied from production (R2), same-origin, so any dev port works without CORS.
 * The built site loads R2 directly.
 */
const LOCAL_ONLY = Boolean(process.env.LOCAL_MAP_ROOT);
const CACHE = mapCache(process.env.LOCAL_MAP_ROOT, fileURLToPath(new URL('../', import.meta.url)));
const TYPES = { avif: 'image/avif', webp: 'image/webp', json: 'application/json' };

/** @returns {import('vite').Plugin} */
const regionsOverlay = () => ({
	name: 'regions-overlay',
	configureServer(server) {
		server.middlewares.use('/regions/', (req, res) => {
			const file = regionAsset(CACHE, req.url);
			if (!file) { res.statusCode = 400; res.end('Invalid asset path'); return; }
			if (existsSync(file) && statSync(file).isFile()) {
				res.setHeader('Content-Type', TYPES[/** @type {'avif'|'webp'|'json'} */ (file.split('.').pop())] ?? 'application/octet-stream');
				res.setHeader('Cache-Control', 'no-store');
				res.setHeader('X-Source', 'local-cache');
				createReadStream(file).pipe(res);
				return;
			}
			if (LOCAL_ONLY) { res.statusCode = 404; res.setHeader('X-Source', 'local-only-missing'); res.end('Asset not present in the local map export'); return; }
			fetch(`${HOSTING.origin}/regions${req.url}`).then(async (r) => {
				res.statusCode = r.status;
				for (const h of ['content-type', 'cache-control', 'etag']) { const v = r.headers.get(h); if (v) res.setHeader(h, v); }
				res.setHeader('X-Source', 'r2');
				res.end(Buffer.from(await r.arrayBuffer()));
			}).catch((e) => { res.statusCode = 502; res.end(String(e)); });
		});
	},
});

/** The asset override is for local development; it must never silently configure deployment. */
/** @returns {import('astro').AstroIntegration} */
const localOnlyGuard = () => ({
	name: 'local-map-dev-only',
	hooks: { 'astro:config:setup': ({ command }) => {
		if (LOCAL_ONLY && ['build', 'preview'].includes(command)) throw new Error('LOCAL_MAP_ROOT is dev-only; unset it before a production build/preview');
	} },
});

/**
 * Real 301s for capitalised city links (/Tel-Aviv-Yafo → /tel-aviv-yafo): writes dist/_redirects,
 * which Cloudflare static assets apply before anything else. Matching is case-sensitive, so each city
 * gets its Title-Case and title-based spellings; anything else still falls back to 404.html's script.
 * (Not Astro's `redirects`: /Tel-Aviv-Yafo.html and /tel-aviv-yafo.html collide on macOS.)
 */
/** @returns {import('astro').AstroIntegration} */
const cityRedirects = () => ({
	name: 'city-redirects',
	hooks: {
		'astro:build:done': ({ dir }) => {
			const lines = [];
			for (const [slug, city] of Object.entries(CITIES)) {
				const titleCase = slug.replace(/(^|-)([a-z])/g, (_, s, c) => s + c.toUpperCase());
				const fromTitle = city.title.trim().replace(/\s+/g, '-');
				for (const from of new Set([titleCase, fromTitle, slug.toUpperCase()])) {
					if (from !== slug && /^[\w-]+$/.test(from)) lines.push(`/${from} /${slug} 301`);
				}
			}
			writeFileSync(new URL('_redirects', dir), lines.join('\n') + '\n');
		},
	},
});

// https://astro.build/config
export default defineConfig({
	integrations: [cityRedirects(), localOnlyGuard()],
	devToolbar: { enabled: !LOCAL_ONLY }, // keep attribution unobscured in the local end-user spike
	site: process.env.SITE_DOMAIN ? `https://${process.env.SITE_DOMAIN}` : undefined,
	vite: {
		// the browser has no process.env: bake the tile origin into the viewer
		define: { __TILES_ORIGIN__: JSON.stringify(LOCAL_ONLY ? '' : HOSTING.origin), __WEB_CACHE__: JSON.stringify(CACHE), __LOCAL_MAP_ONLY__: JSON.stringify(LOCAL_ONLY) },
		server: { strictPort: LOCAL_ONLY },
		// pre-bundle the viewer so the dev server never serves a stale dependency
		optimizeDeps: { include: ['openseadragon'] },
		plugins: [regionsOverlay()],
	},
});
