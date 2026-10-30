// Studio password gate. Runs before every request, including static pages.
// Pages without a valid unlock cookie get an on-page unlock form; POST /unlock checks the password and sets
// an HttpOnly cookie for 30 days. API calls without it get a 401 JSON error. Basic auth (user "studio") still
// works for scripts. Pricing, legal pages and the files they need stay public. With no STUDIO_PASSWORD set the
// site is open.
import type { Config, Context } from "@netlify/edge-functions";

const PUBLIC_PATHS = new Set(["/privacy", "/terms", "/refunds", "/cookies", "/pricing", "/pricing.html", "/legal", "/legal.html",
	"/api/business", "/site.js", "/site.css", "/page.css", "/vendor/marked.min.js", "/content/business.json", "/favicon.ico"]);
const COOKIE = "sd_unlock";
const MAX_AGE = 60 * 60 * 24 * 30;

const enc = new TextEncoder();

async function digest(s: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

async function same(a: string, b: string): Promise<boolean> {
	const [x, y] = await Promise.all([digest(a), digest(b)]);
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
}

// Cookie value: HMAC of a fixed label keyed by the password, so changing the password locks every device out.
async function token(password: string): Promise<string> {
	const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("studded-design-unlock-v1")));
	return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

function cookieValue(req: Request): string {
	const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]+)`).exec(req.headers.get("Cookie") || "");
	return m ? m[1] : "";
}

function safeNext(raw: string | null): string {
	const n = String(raw || "/");
	return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function unlockPage(next: string, wrong: boolean): Response {
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unlock · Studded Design</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800&family=Public+Sans:wght@400;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:#16191C;color:#16191C;font:16px/1.5 'Public Sans',system-ui,sans-serif}
.card{background:#EFEFEC;border:3px solid #16191C;box-shadow:6px 6px 0 rgba(0,0,0,.45);width:100%;max-width:420px;padding:26px}
.studs{display:flex;gap:6px;margin-bottom:14px}.studs i{width:16px;height:16px;border-radius:50%;background:#F5CD30;border:2px solid #16191C}
h1{margin:0 0 6px;font:800 34px/1 'Big Shoulders Display','Arial Narrow',sans-serif;text-transform:uppercase}
p{margin:0 0 18px;color:#3a3f44}
label{display:block;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
input{width:100%;font:inherit;padding:12px;border:2px solid #16191C;background:#fff;color:#16191C}
input:focus{outline:3px solid #F5CD30;outline-offset:1px}
button{margin-top:14px;width:100%;font:800 15px 'Public Sans',system-ui,sans-serif;text-transform:uppercase;letter-spacing:.03em;padding:12px;border:2px solid #16191C;background:#F5CD30;color:#16191C;cursor:pointer;box-shadow:3px 3px 0 #16191C}
button:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #16191C}
.err{background:#16191C;color:#F5CD30;padding:8px 12px;font-weight:700;margin-bottom:14px}
.links{margin-top:16px;font-size:14px}.links a{color:#16191C}
</style></head>
<body><main class="card">
<div class="studs" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<h1>Studded Design</h1>
<p>This studio is private. Enter the password to unlock it on this device.</p>
${wrong ? '<div class="err" role="alert">Wrong password. Try again.</div>' : ""}
<form method="post" action="/unlock">
<input type="hidden" name="next" value="${esc(next)}">
<label for="pw">Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">Unlock</button>
</form>
<div class="links"><a href="/pricing">Pricing</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></div>
</main></body></html>`;
	return new Response(html, { status: wrong ? 401 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export default async (req: Request, context: Context) => {
	const password = Netlify.env.get("STUDIO_PASSWORD");
	const url = new URL(req.url);
	const p = url.pathname;
	if (!password || PUBLIC_PATHS.has(p) || p.startsWith("/api/legal/") || p.startsWith("/content/legal/")) return context.next();

	if (p === "/unlock") {
		if (req.method !== "POST") return unlockPage(safeNext(url.searchParams.get("next")), false);
		const form = await req.formData();
		const next = safeNext(String(form.get("next") || "/"));
		if (!(await same(String(form.get("password") || ""), password))) return unlockPage(next, true);
		return new Response(null, { status: 303, headers: {
			Location: next,
			"Set-Cookie": `${COOKIE}=${await token(password)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
		} });
	}
	if (p === "/lock") {
		return new Response(null, { status: 303, headers: { Location: "/unlock", "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
	}

	const c = cookieValue(req);
	if (c && (await same(c, await token(password)))) return context.next();
	const m = /^Basic (.+)$/.exec(req.headers.get("Authorization") || "");
	let given = "";
	try { given = m ? atob(m[1]) : ""; } catch { given = ""; }
	if (m && (await same(given, `studio:${password}`))) return context.next();

	if (p.startsWith("/api/") || p.startsWith("/refs/")) {
		return new Response(JSON.stringify({ error: { message: "Locked. Unlock the studio first." } }), {
			status: 401, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
		});
	}
	return unlockPage(p + url.search, false);
};

export const config: Config = { path: "/*" };
