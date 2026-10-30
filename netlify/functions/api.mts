// Everything under /api except the AI routes, plus /refs/<slug>/<file> for saved references.
// Storage is Netlify Blobs (one "studio" store; key layout in ../lib/shared.mts).
import type { Config } from "@netlify/functions";
import { aiReady, AI_MODEL, asset, assetJSON, assetText, fail, json, slugify, store, type Json } from "../lib/shared.mts";

const LEGAL = ["privacy", "terms", "refunds", "cookies"];
const EXT: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
	"image/gif": ".gif", "video/mp4": ".mp4", "video/quicktime": ".mov" };
const MIME: Record<string, string> = { md: "text/markdown; charset=utf-8" };
const MAX_UPLOAD = 5 * 1024 * 1024;       // a request to a Netlify Function can't be much over 6 MB

function briefMarkdown(b: Json, files: Json[], link: string): string {
	const L: string[] = [`# ${b.name}`, "", `Studded model brief from Studded Design, saved ${new Date().toISOString().slice(0, 10)}.`, "",
		"**To build it:** tell Claude to use the `studded-models` skill on this brief.", "",
		"| Field | Value |", "|---|---|", `| Type | ${b.type} |`, `| Height | ${b.height || "?"} studs |`,
		`| Base | ${b.base ? "Socle + Dalles" : "None"} |`, `| Rig | ${b.rig ? "Yes" : "No (static)"} |`];
	if (b.rig) L.push(`| Animations | ${(b.animations || []).join(", ") || "none listed"} |`);
	L.push("| Faces | -Y (front) |", "", "## References", "");
	for (const f of files) L.push(`- **${f.slot}**: ${link}${f.file}${f.note ? ` (${f.note})` : ""}`);
	if ((b.missing || []).length) L.push("", `**Missing required references:** ${b.missing.join(", ")}. Ask the user for these before building.`);
	if ((b.palette || []).length) {
		L.push("", "## Palette (sampled from the references)", "", "| Key | Hex |", "|---|---|");
		for (const c of b.palette) L.push(`| ${c.key} | ${c.hex} |`);
	}
	if ((b.parts || []).length) {
		L.push("", "## Part table (draft: measure against the references before trusting it)", "",
			"| Part | Shape | Size (w × d × h, studs) | Colour | Joint |", "|---|---|---|---|---|");
		for (const p of b.parts) L.push(`| ${p.part || ""} | ${p.shape || ""} | ${p.size || ""} | ${p.colour || ""} | ${p.joint || "-"} |`);
	}
	if (b.notes) L.push("", "## Notes", "", b.notes);
	if (b.analysis) L.push("", "## AI read of the references", "", b.analysis);
	return L.join("\n") + "\n";
}

function dataURL(u: string): { mime: string; bytes: Uint8Array } | null {
	const m = /^data:([\w/+.-]+);base64,(.*)$/s.exec(u || "");
	if (!m) return null;
	return { mime: m[1], bytes: new Uint8Array(Buffer.from(m[2], "base64")) };
}

async function apiSaveBrief(req: Request): Promise<Response> {
	const b: Json = await req.json();
	const slug = slugify(b.name);
	const s = store();
	const files: Json[] = [];
	for (const [i, r] of (b.refs || []).entries()) {
		if (r.existing) { files.push({ slot: r.slot, file: r.existing, note: r.note }); continue; }
		const d = dataURL(r.data);
		if (!d || !EXT[d.mime]) continue;
		if (d.bytes.length > MAX_UPLOAD) return fail(413, `${r.slot}: file over 5 MB`);
		const file = `${slugify(r.slot)}-${Date.now().toString(36)}${i + 1}${EXT[d.mime]}`;
		await s.set(`file:${slug}/${file}`, d.bytes.buffer as ArrayBuffer, { metadata: { type: d.mime } });
		files.push({ slot: r.slot, file, note: r.note });
	}
	const link = `${new URL(req.url).origin}/refs/${slug}/`;
	const meta = { ...b, refs: files, slug, savedAt: new Date().toISOString() };
	const card = { name: b.name, type: b.type, savedAt: meta.savedAt, refs: files.length, missing: b.missing || [],
		thumb: files.find((f) => /\.(png|jpe?g|webp|gif)$/.test(f.file))?.file || null };
	await Promise.all([
		s.setJSON(`brief:${slug}`, meta),
		s.setJSON(`card:${slug}`, card),
		s.set(`briefmd:${slug}`, briefMarkdown(b, files, link)),
	]);
	return json({ ok: true, slug, path: `${link}brief.md`, link: `${link}brief.md`,
		prompt: `Use the studded-models skill to build the brief at ${link}brief.md` });
}

async function keys(prefix: string): Promise<string[]> {
	const { blobs } = await store().list({ prefix });
	return blobs.map((b) => b.key);
}

async function apiListBriefs(): Promise<Response> {
	const s = store();
	const out = await Promise.all((await keys("card:")).map(async (k) => ({ slug: k.slice(5), ...((await s.get(k, { type: "json" })) || {}) })));
	out.sort((a: Json, b: Json) => String(b.savedAt).localeCompare(String(a.savedAt)));
	return json(out);
}

async function deleteBrief(slug: string): Promise<void> {
	const s = store();
	const files = await keys(`file:${slug}/`);
	await Promise.all([...files.map((k) => s.delete(k)),
		s.delete(`brief:${slug}`), s.delete(`card:${slug}`), s.delete(`briefmd:${slug}`)]);
}

async function apiDeleteAll(req: Request): Promise<Response> {
	const { confirm } = (await req.json()) as Json;
	if (confirm !== "DELETE") return fail(400, "Type DELETE to confirm");
	const briefs = await keys("brief:");
	for (const k of briefs) await deleteBrief(k.slice(6));
	const s = store();
	await Promise.all((await keys("kv:")).map((k) => s.delete(k)));
	return json({ ok: true, briefsDeleted: briefs.length });
}

async function serveRef(rest: string): Promise<Response> {
	const [slugRaw, ...nameParts] = rest.split("/");
	const slug = slugify(decodeURIComponent(slugRaw));
	const name = decodeURIComponent(nameParts.join("/"));
	const s = store();
	if (name === "brief.md") {
		const md = await s.get(`briefmd:${slug}`, { type: "text" });
		return md == null ? new Response("not found", { status: 404 }) : new Response(md, { headers: { "Content-Type": MIME.md } });
	}
	if (!/^[a-z0-9-]+\.(png|jpg|jpeg|webp|gif|mp4|mov)$/.test(name)) return new Response("not found", { status: 404 });
	const got = await s.getWithMetadata(`file:${slug}/${name}`, { type: "arrayBuffer" });
	if (!got) return new Response("not found", { status: 404 });
	return new Response(got.data, { headers: { "Content-Type": String(got.metadata?.type || "application/octet-stream"), "Cache-Control": "private, max-age=3600" } });
}

async function apiLegal(req: Request, doc: string): Promise<Response> {
	if (!LEGAL.includes(doc)) return fail(404, "no such page");
	const b = await assetJSON(req, "/content/business.json");
	let md = await assetText(req, `/content/legal/${doc}.md`);
	md = md.replace(/\{\{(\w+)\}\}/g, (_, k) => (b[k] == null ? `[${k}]` : String(b[k])));
	return json({ markdown: md, draft: /\[[A-Z][^\]]*\]/.test(JSON.stringify(b)) });
}

async function apiDoc(req: Request, id: string | null): Promise<Response> {
	const name = String(id || "").split(":")[1] || "";
	if (!/^[\w.-]+\.md$/.test(name)) return fail(400, "bad doc");
	const r = await asset(req, `/content/docs/${name}`);
	return new Response(await r.text(), { status: r.status, headers: { "Content-Type": MIME.md } });
}

async function proxy(r: Response): Promise<Response> {
	return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export default async (req: Request): Promise<Response> => {
	const url = new URL(req.url);
	const p = url.pathname;
	try {
		if (p === "/api/health") return json({ ok: true, ai: aiReady(), model: AI_MODEL });
		if (p.startsWith("/api/kv/")) {
			const key = `kv:${decodeURIComponent(p.slice(8))}`;
			if (req.method === "GET") {
				const value = await store().get(key, { type: "text" });
				return json(value == null ? { value: null } : { key: key.slice(3), value });
			}
			const { value } = (await req.json()) as Json;
			await store().set(key, String(value));
			return json({ ok: true });
		}
		if (p === "/api/docs") return proxy(await asset(req, "/content/docs/index.json"));
		if (p === "/api/doc") return await apiDoc(req, url.searchParams.get("id"));
		if (p === "/api/briefs" && req.method === "GET") return await apiListBriefs();
		if (p === "/api/briefs" && req.method === "POST") return await apiSaveBrief(req);
		if (p.startsWith("/api/briefs/")) {
			const slug = slugify(decodeURIComponent(p.slice(12)));
			if (req.method === "DELETE") { await deleteBrief(slug); return json({ ok: true }); }
			const v = await store().get(`brief:${slug}`, { type: "text" });
			return v == null ? fail(404, "not found") : new Response(v, { headers: { "Content-Type": "application/json" } });
		}
		if (p === "/api/delete-all" && req.method === "POST") return await apiDeleteAll(req);
		if (p === "/api/business") return proxy(await asset(req, "/content/business.json"));
		if (p.startsWith("/api/legal/")) return await apiLegal(req, p.slice(11));
		if (p.startsWith("/refs/")) return await serveRef(p.slice(6));
		return fail(404, "not found");
	} catch (e: any) {
		return fail(e?.status || 500, e?.message || "Server error");
	}
};

export const config: Config = {
	path: ["/api/*", "/refs/*"],
	excludedPath: ["/api/messages", "/api/analyze"],
};
