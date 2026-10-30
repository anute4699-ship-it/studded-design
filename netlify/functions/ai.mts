// AI routes: Venture Scout (/api/messages, Anthropic-shaped so the page code is unchanged) and
// Draft from references (/api/analyze). Netlify rate-limits these to 6 per minute per visitor.
import type { Config } from "@netlify/functions";
import { aiChat, AI_MODEL, fail, json, type Json } from "../lib/shared.mts";

async function robloxSearch(query: string): Promise<Json[]> {
	const u = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&sessionId=studstudio${Date.now()}&pageType=all`;
	const r = await fetch(u, { headers: { Accept: "application/json" } });
	if (!r.ok) throw new Error(`Roblox search ${r.status}`);
	const d: any = await r.json();
	const games: Json[] = [];
	for (const g of d.searchResults || []) {
		if (g.contentGroupType !== "Game") continue;
		for (const c of g.contents || []) {
			games.push({ name: c.name, playing: c.playerCount, upvotes: c.totalUpVotes, url: `https://www.roblox.com/games/${c.rootPlaceId}` });
		}
	}
	return games.slice(0, 10);
}

function searchQueries(idea: string): string[] {
	const stop = new Set("a an the and or but on in of to for with you your u i im my it is are be want trying make game roblox off thru".split(" "));
	const keep = (String(idea).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !stop.has(w) && w.length > 2);
	return [...new Set([keep.slice(0, 3).join(" "), keep.slice(0, 2).join(" ")])].filter(Boolean);
}

async function apiMessages(req: Request): Promise<Response> {
	const p: Json = await req.json();
	const messages: Json[] = [];
	if (p.system) messages.push({ role: "system", content: p.system });
	const wantsSearch = (p.tools || []).some((t: Json) => String(t.type || t.name).includes("web_search"));
	for (const m of p.messages || []) {
		const content = typeof m.content === "string" ? m.content : (m.content || []).map((b: Json) => b.text || "").join("\n");
		messages.push({ role: m.role, content });
	}
	if (wantsSearch) {
		const user = [...messages].reverse().find((m) => m.role === "user")!;
		const idea = (user.content.match(/"""\n([\s\S]*?)\n"""/) || [])[1] || user.content;
		let results: Json[] = [];
		for (const q of searchQueries(idea)) {
			try { results.push(...(await robloxSearch(q))); } catch { /* fall through */ }
		}
		const seen = new Set<string>();
		results = results.filter((g) => !seen.has(g.url) && (seen.add(g.url), true));
		if (!results.length) return fail(503, "Roblox search unavailable");
		user.content += "\n\nLIVE roblox.com SEARCH RESULTS (the only URLs you may use):\n"
			+ results.map((g) => `- ${g.name} | ${g.playing} playing | ${g.upvotes} upvotes | ${g.url}`).join("\n");
	}
	const text = await aiChat(messages, p.max_tokens, p.temperature);
	return json({ content: [{ type: "text", text }], model: AI_MODEL });
}

async function apiAnalyze(req: Request): Promise<Response> {
	const b: Json = await req.json();
	const content: Json[] = [{ type: "text", text:
		`You are planning a studded, brick-style 3D model (Stud Free Pack style: low-poly boxes, n-gon prisms and stepped-sphere stacks; studs are a texture at 1 per unit). `
		+ `Subject: "${b.name}" (${b.type}), target height ${b.height || "about 9"} studs, facing -Y. `
		+ `From the reference images, return ONE JSON object and nothing else: `
		+ `{"summary":"2 sentences on silhouette and proportions","parts":[{"part":"name","shape":"box|prism|tiers|feature","size":"w x d x h in studs","colour":"plain colour name","joint":"pivot for rigged parts or -"}],"questions":["what is unclear in the references"]}. `
		+ `8-20 parts. Measure proportions from the images; do not invent details that are not visible.` }];
	for (const img of (b.images || []).slice(0, 4)) content.push({ type: "image_url", image_url: { url: img } });
	const text = await aiChat([{ role: "user", content }], 1500, 0.2);
	return json({ text, model: AI_MODEL });
}

export default async (req: Request): Promise<Response> => {
	const p = new URL(req.url).pathname;
	try {
		return p === "/api/messages" ? await apiMessages(req) : await apiAnalyze(req);
	} catch (e: any) {
		return fail(e?.status || 500, e?.message || "Server error");
	}
};

export const config: Config = {
	path: ["/api/messages", "/api/analyze"],
	method: ["POST"],
	rateLimit: {
		windowLimit: 6,
		windowSize: 60,
		aggregateBy: ["ip", "domain"],
	},
};
