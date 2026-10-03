// Cloudflare Pages Functions entry for every /api/* route. Same handlers as the Netlify functions.
import { useEnv } from "../../lib/cf.mjs";
import likes from "../../lib/api/likes.mjs";
import chat from "../../lib/api/chat.mjs";
import unsubscribe from "../../lib/api/unsubscribe.mjs";
import accountDelete from "../../lib/api/account-delete.mjs";
import sendIdeas from "../../lib/api/send-ideas.mjs";
import form from "../../lib/api/form.mjs";

const ROUTES = { likes, chat, unsubscribe, "account-delete": accountDelete, form };

export async function onRequest({ request, env, params }) {
  useEnv(env);
  const name = (params.path || []).join("/");
  if (name === "send-ideas") {
    // No cron in Pages Functions: a scheduled GitHub Action calls this with the shared secret.
    if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return new Response("Forbidden", { status: 403 });
    return Response.json(await sendIdeas());
  }
  const h = ROUTES[name];
  if (!h) return new Response("Not found", { status: 404 });
  return h(request, { ip: request.headers.get("cf-connecting-ip") || "unknown" });
}
