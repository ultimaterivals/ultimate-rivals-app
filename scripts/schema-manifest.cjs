#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { writeFileSync } = require("node:fs");

const args = process.argv.slice(2);

const hasArg = (name) => args.includes(name);
const getArg = (name, fallback = undefined) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const outputPath = getArg("--out", "fresh-schema-manifest.json");

const manifestSql = `
with relevant_schemas as (
  select unnest(array['public', 'storage'])::name as schema_name
),
tables as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
  where c.relkind in ('r', 'p')
),
columns as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    a.attnum as ordinal,
    a.attname as column_name,
    format_type(a.atttypid, a.atttypmod) as data_type,
    a.attnotnull as not_null,
    coalesce(pg_get_expr(ad.adbin, ad.adrelid), null) as default_expr,
    a.attidentity as identity_kind,
    a.attgenerated as generated_kind
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
  left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
  where c.relkind in ('r', 'p')
    and a.attnum > 0
    and not a.attisdropped
),
constraints as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid, true) as definition
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
),
indexes as (
  select
    ns.nspname as schema_name,
    tbl.relname as table_name,
    idx.relname as index_name,
    i.indisunique as is_unique,
    i.indisprimary as is_primary,
    pg_get_indexdef(idx.oid) as definition
  from pg_index i
  join pg_class idx on idx.oid = i.indexrelid
  join pg_class tbl on tbl.oid = i.indrelid
  join pg_namespace ns on ns.oid = tbl.relnamespace
  join relevant_schemas rs on rs.schema_name = ns.nspname
),
enums as (
  select
    n.nspname as schema_name,
    t.typname as enum_name,
    jsonb_agg(e.enumlabel order by e.enumsortorder) as labels
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
  group by n.nspname, t.typname
),
functions as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as returns,
    p.prosecdef as security_definer,
    p.provolatile as volatility,
    md5(pg_get_functiondef(p.oid)) as definition_hash
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
),
views as (
  select
    n.nspname as schema_name,
    c.relname as view_name,
    c.relkind as view_kind,
    coalesce(c.reloptions, array[]::text[]) as reloptions,
    md5(pg_get_viewdef(c.oid, true)) as definition_hash
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
  where c.relkind in ('v', 'm')
),
triggers as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid, true) as definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
  where not t.tgisinternal
),
policies as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    pol.polname as policy_name,
    pol.polcmd as command,
    (
      select jsonb_agg(r.rolname order by r.rolname)
      from pg_roles r
      where r.oid = any(pol.polroles)
    ) as roles,
    pg_get_expr(pol.polqual, pol.polrelid, true) as using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid, true) as with_check_expr
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  join relevant_schemas rs on rs.schema_name = n.nspname
),
grants as (
  select
    table_schema as schema_name,
    table_name as object_name,
    grantee,
    privilege_type
  from information_schema.role_table_grants
  where table_schema in (select schema_name::text from relevant_schemas)
    and grantee in ('anon', 'authenticated', 'service_role')
)
select jsonb_pretty(
  jsonb_build_object(
    'manifest_version', 1,
    'schemas', (
      select coalesce(jsonb_agg(schema_name order by schema_name), '[]'::jsonb)
      from relevant_schemas
    ),
    'tables', (
      select coalesce(jsonb_agg(to_jsonb(t) order by schema_name, table_name), '[]'::jsonb)
      from tables t
    ),
    'columns', (
      select coalesce(jsonb_agg(to_jsonb(c) order by schema_name, table_name, ordinal), '[]'::jsonb)
      from columns c
    ),
    'constraints', (
      select coalesce(jsonb_agg(to_jsonb(c) order by schema_name, table_name, constraint_name), '[]'::jsonb)
      from constraints c
    ),
    'indexes', (
      select coalesce(jsonb_agg(to_jsonb(i) order by schema_name, table_name, index_name), '[]'::jsonb)
      from indexes i
    ),
    'enums', (
      select coalesce(jsonb_agg(to_jsonb(e) order by schema_name, enum_name), '[]'::jsonb)
      from enums e
    ),
    'functions', (
      select coalesce(jsonb_agg(to_jsonb(f) order by schema_name, function_name, arguments), '[]'::jsonb)
      from functions f
    ),
    'views', (
      select coalesce(jsonb_agg(to_jsonb(v) order by schema_name, view_name), '[]'::jsonb)
      from views v
    ),
    'triggers', (
      select coalesce(jsonb_agg(to_jsonb(t) order by schema_name, table_name, trigger_name), '[]'::jsonb)
      from triggers t
    ),
    'policies', (
      select coalesce(jsonb_agg(to_jsonb(p) order by schema_name, table_name, policy_name), '[]'::jsonb)
      from policies p
    ),
    'grants', (
      select coalesce(jsonb_agg(to_jsonb(g) order by schema_name, object_name, grantee, privilege_type), '[]'::jsonb)
      from grants g
    )
  )
);
`;

if (hasArg("--print-sql")) {
  process.stdout.write(manifestSql);
  process.exit(0);
}

if (!hasArg("--local")) {
  console.error(
    "Usage: node scripts/schema-manifest.cjs --local [--out fresh-schema-manifest.json]",
  );
  process.exit(2);
}

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  });
}

function findSupabaseDbContainer() {
  const names = run("docker", [
    "ps",
    "--filter",
    "name=supabase_db_",
    "--format",
    "{{.Names}}",
  ])
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    throw new Error("No running Supabase local database container found.");
  }

  return names[0];
}

const container = findSupabaseDbContainer();
const manifestText = run("docker", [
  "exec",
  "-i",
  container,
  "psql",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-At",
  "-c",
  manifestSql,
]);

JSON.parse(manifestText);
writeFileSync(outputPath, `${manifestText.trim()}\n`, "utf8");
console.log(`Wrote schema manifest to ${outputPath}`);
