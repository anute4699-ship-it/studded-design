// Studio password gate (Basic auth, user "studio"). Runs before every request, including static pages.
// Pricing, legal pages and the files they need stay public. With no STUDIO_PASSWORD set the site is open.
import type { Config, Context } from "@netlify/edge-functions";

const PUBLIC_PATHS = new Set(["/privacy", "/terms", "/refunds", "/cookies", "/pricing", "/pricing.html", "/legal", "/legal.html",
	"/api/business", "/site.js", "/site.css", "/page.css", "/vendor/marked.min.js", "/content/business.json", "/favicon.ico"]);

async function digest(s: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

async function same(a: string, b: string): Promise<boolean> {
	const [x, y] = await Promise.all([digest(a), digest(b)]);
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
}

export default async (req: Request, context: Context) => {
	const password = Netlify.env.get("STUDIO_PASSWORD");
	const p = new URL(req.url).pathname;
	if (!password || PUBLIC_PATHS.has(p) || p.startsWith("/api/legal/") || p.startsWith("/content/legal/")) return context.next();
	const m = /^Basic (.+)$/.exec(req.headers.get("Authorization") || "");
	let given = "";
	try { given = m ? atob(m[1]) : ""; } catch { given = ""; }
	if (m && (await same(given, `studio:${password}`))) return context.next();
	return new Response("Password required", {
		status: 401, headers: { "WWW-Authenticate": 'Basic realm="Studded Design", charset="UTF-8"' },
	});
};

export const config: Config = { path: "/*" };
