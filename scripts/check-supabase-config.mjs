import { existsSync, readFileSync } from "node:fs";

const configPath = "supabase/config.toml";
const envPath = ".env";

function read(path) {
  return readFileSync(path, "utf8");
}

function parseDotEnv(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

function projectRefFromUrl(url) {
  if (!url) return "";
  try {
    const host = new URL(url).hostname;
    const parts = host.split(".");
    if (parts[0] === "db" && parts[1]) return parts[1];
    if (parts[1] === "supabase") return parts[0];
  } catch {
    return "";
  }
  return "";
}

function fail(message) {
  console.error(`Supabase config check failed: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(configPath)) {
  fail(`missing ${configPath}`);
  process.exit();
}

const config = read(configPath);
const projectMatch = config.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
const expectedProjectRef = projectMatch?.[1] ?? "";

if (!expectedProjectRef) {
  fail(`could not read project_id from ${configPath}`);
  process.exit();
}

const fileEnv = existsSync(envPath) ? parseDotEnv(read(envPath)) : {};
const env = { ...fileEnv, ...process.env };

const checks = [
  ["SUPABASE_PROJECT_ID", env.SUPABASE_PROJECT_ID],
  ["VITE_SUPABASE_PROJECT_ID", env.VITE_SUPABASE_PROJECT_ID],
  ["SUPABASE_URL", projectRefFromUrl(env.SUPABASE_URL)],
  ["VITE_SUPABASE_URL", projectRefFromUrl(env.VITE_SUPABASE_URL)],
];

let ok = true;
for (const [name, value] of checks) {
  if (!value) continue;
  if (value !== expectedProjectRef) {
    ok = false;
    console.error(
      `${name} points to "${value}", but ${configPath} points to "${expectedProjectRef}".`,
    );
  }
}

if (!ok) {
  fail("Supabase project references do not match.");
} else {
  console.log(`Supabase config OK: ${expectedProjectRef}`);
}
