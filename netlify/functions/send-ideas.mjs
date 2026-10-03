import "./_store.mjs";
import run from "../../lib/api/send-ideas.mjs";
export default async () => { await run(); };
export const config = { schedule: "@hourly" };
