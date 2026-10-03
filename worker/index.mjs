// Cloudflare Workers entry (Workers Builds runs `npx wrangler deploy`, see wrangler.jsonc).
// Static pages come from dist/ via the ASSETS binding; /api/* runs the same handlers as Netlify / Pages.
import { onRequest } from "../functions/api/[[path]].js";
import { useEnv } from "../lib/cf.mjs";
import sendIdeas from "../lib/api/send-ideas.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url), { pathname } = url;
    // One address for search engines: www → bare domain.
    if (url.hostname === "www.recipesbyninjas.com") { url.hostname = "recipesbyninjas.com"; return Response.redirect(url.toString(), 301); }
    if (pathname.startsWith("/api/")) {
      return onRequest({ request, env, params: { path: pathname.slice(5).split("/").filter(Boolean) } });
    }
    return env.ASSETS.fetch(request);
  },
  // Hourly "Tonight by Ninjas" check (does nothing until email is set up).
  async scheduled(_event, env, ctx) {
    useEnv(env);
    ctx.waitUntil(sendIdeas().catch((e) => console.error("send-ideas", e)));
  },
};
