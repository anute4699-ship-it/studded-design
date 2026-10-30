// Shared helpers for the Netlify Functions (port of ../../stud-studio/cloud/src/index.ts).
import { getStore } from "@netlify/blobs";

export type Json = Record<string, any>;

// brief:<slug>        -> brief JSON
// card:<slug>         -> list-card summary (Blobs lists keys without metadata, so cards are their own blobs)
// briefmd:<slug>      -> brief.md
// file:<slug>/<name>  -> uploaded reference (metadata.type = MIME)
// kv:<key>            -> small key-value store (Venture Scout shortlist)
export const store = () => getStore({ name: "studio", consistency: "strong" });

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
	});
}
export const fail = (status: number, message: string) => json({ error: { message } }, status);

export function slugify(s: unknown): string {
	return String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "untitled";
}

// Static files from /public, fetched from our own origin. The visitor's Authorization header is passed on so
// password-gated files (docs) still load through the edge gate.
export async function asset(req: Request, path: string): Promise<Response> {
	const headers: Record<string, string> = {};
	const auth = req.headers.get("Authorization");
	if (auth) headers.Authorization = auth;
	return fetch(new URL(path, req.url), { headers });
}

export async function assetJSON<T = Json>(req: Request, path: string): Promise<T> {
	const r = await asset(req, path);
	if (!r.ok) throw new Error(`missing ${path}`);
	return r.json() as Promise<T>;
}

export async function assetText(req: Request, path: string): Promise<string> {
	const r = await asset(req, path);
	if (!r.ok) throw new Error(`missing ${path}`);
	return r.text();
}

// ---------------------------------------------------------------- AI (Netlify AI Gateway)

export const AI_MODEL = process.env.AI_MODEL || "gpt-4.1-mini";

function gateway(): { url: string; key: string } | null {
	const gw = process.env.NETLIFY_AI_GATEWAY_BASE_URL, gk = process.env.NETLIFY_AI_GATEWAY_KEY;
	if (gw && gk) return { url: `${gw.replace(/\/$/, "")}/openai/v1/chat/completions`, key: gk };
	const ob = process.env.OPENAI_BASE_URL, ok = process.env.OPENAI_API_KEY;
	if (ob && ok) return { url: `${ob.replace(/\/$/, "")}/chat/completions`, key: ok };
	return null;
}

export const aiReady = () => gateway() !== null;

export async function aiChat(messages: Json[], max_tokens = 1000, temperature?: number): Promise<string> {
	const g = gateway();
	if (!g) throw Object.assign(new Error("AI is not switched on yet. It starts after the site's first production deploy."), { status: 503 });
	const body: Json = { model: AI_MODEL, messages, max_tokens };
	if (temperature != null) body.temperature = temperature;
	const r = await fetch(g.url, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${g.key}` },
		body: JSON.stringify(body),
	});
	const d: any = await r.json().catch(() => ({}));
	if (!r.ok) throw Object.assign(new Error(`AI ${r.status}: ${d?.error?.message || "request failed"}`), { status: r.status === 429 ? 429 : 502 });
	return String(d?.choices?.[0]?.message?.content ?? "");
}
