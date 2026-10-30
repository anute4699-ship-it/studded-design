# Studded Design

Studded model briefs and Venture Scout, hosted on Netlify. This is the Netlify port of the Cloudflare
version in `stud-studio/cloud`.

- `public/`: the pages, served as static files.
- `netlify/functions/api.mts`: briefs, saved references, the shortlist store, legal pages and docs. Data is kept in Netlify Blobs.
- `netlify/functions/ai.mts`: the AI routes, Draft from references and Venture Scout. They call OpenAI `gpt-4.1-mini` through the Netlify AI Gateway, so no API key lives in this repo. Each visitor is rate-limited to 6 calls a minute.
- `netlify/edge-functions/gate.ts`: a password gate for the studio. The user name is `studio`, and the password is the `STUDIO_PASSWORD` environment variable set in the Netlify UI. Pricing and the legal pages stay public. If `STUDIO_PASSWORD` is not set, the whole site is open.

## Settings (Netlify UI: Site configuration > Environment variables)

| Variable | Needed | What it does |
|---|---|---|
| `STUDIO_PASSWORD` | Recommended | Turns the password gate on. Without it, anyone can save briefs or delete all data. |
| `AI_MODEL` | No | Overrides the AI model. The default is `gpt-4.1-mini`. |

The AI Gateway turns on by itself after the first production deploy, on Netlify's credit-based plans, including Free.

## Check locally

    npm install
    npm run check
