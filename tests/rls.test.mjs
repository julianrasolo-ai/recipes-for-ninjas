// Runs supabase/migrations/*.sql in PGlite with a minimal stand-in for Supabase's auth schema,
// then proves row-level security keeps two households apart.  node tests/rls.test.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated nologin;
`);
await db.exec(readFileSync("supabase/migrations/001_accounts.sql", "utf8"));
await db.exec(`grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated; grant usage on schema auth to authenticated; grant execute on all functions in schema public to authenticated;`);

const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
await db.exec(`insert into auth.users values ('${A}','a@x.com'),('${B}','b@x.com')`);
async function as(user, sql) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try { return await db.query(sql); } finally { await db.exec(`reset role;`); }
}

const ha = (await as(A, `insert into households (owner_id, name, appliances) values ('${A}','A home','{creami}') returning id`)).rows[0].id;
const hb = (await as(B, `insert into households (owner_id, name) values ('${B}','B home') returning id`)).rows[0].id;
const pa = (await as(A, `insert into profiles (household_id, name, allergies) values ('${ha}','Julian','{peanut}') returning id`)).rows[0].id;
await as(A, `insert into likes values ('${pa}','creami/tropical-fruit-whip')`);
await as(A, `insert into account_settings (user_id, email_consent) values ('${A}', true)`);

assert.equal((await as(A, `select * from households`)).rows.length, 1, "A sees own household");
assert.equal((await as(B, `select * from households`)).rows.length, 1, "B sees only own household");
assert.equal((await as(B, `select * from profiles`)).rows.length, 0, "B can't see A's profiles");
assert.equal((await as(B, `select * from likes`)).rows.length, 0, "B can't see A's likes");
assert.equal((await as(B, `select * from account_settings`)).rows.length, 0, "B can't see A's settings");
await assert.rejects(as(B, `insert into profiles (household_id, name) values ('${ha}','Intruder')`), "B can't add a profile to A's household");
await assert.rejects(as(B, `insert into likes values ('${pa}','creami/x')`), "B can't like as A's profile");
await assert.rejects(as(A, `insert into households (owner_id, name) values ('${B}','fake')`), "can't create a household for someone else");
await assert.rejects(as(A, `insert into email_log (user_id, recipe_keys) values ('${A}','{creami/x}')`), "users can't write the email log");
await assert.rejects(as(A, `insert into likes values ('${pa}','not a key')`), "recipe_key format enforced");
assert.equal((await as(A, `select name from profiles`)).rows[0].name, "Julian");
// deleting the auth user removes everything (account deletion)
await db.exec(`delete from auth.users where id='${A}'`);
assert.equal((await db.query(`select count(*)::int n from households where id='${ha}'`)).rows[0].n, 0, "household deleted with account");
assert.equal((await db.query(`select count(*)::int n from likes`)).rows[0].n, 0, "likes deleted with account");
console.log("RLS tests passed");
