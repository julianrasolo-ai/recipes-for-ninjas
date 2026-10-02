// Shared by the Netlify function and the local dev server.
export const PEOPLE = ["Julian", "Charlyne", "Leanne", "Noah"];
export const SECTIONS = ["ice", "juice"];

export function validate(op) {
  if (!op || !SECTIONS.includes(op.s)) return "Unknown section";
  if (typeof op.id !== "string" || !/^[a-z0-9]{1,8}$/.test(op.id)) return "Bad recipe id";
  if (!PEOPLE.includes(op.p)) return "Unknown person";
  if (typeof op.on !== "boolean") return "Missing on/off";
  return null;
}

export function applyToggle(likes, { id, p, on }) {
  const next = { ...likes };
  const list = (next[id] || []).filter((x) => x !== p);
  if (on) list.push(p);
  if (list.length) next[id] = list;
  else delete next[id];
  return next;
}
