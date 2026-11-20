import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.ts";

type Rec = { id: string; type: string; display_name: string; verified: boolean } & Record<string, unknown>;

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = (f: string) => JSON.parse(readFileSync(join(root, f), "utf8"));

/** Locale-independent order: lowercase display_name, then id (ids are unique, so the order is total). */
export const byDisplayName = (a: Rec, b: Rec) => {
  const x = a.display_name.toLowerCase();
  const y = b.display_name.toLowerCase();
  return x < y ? -1 : x > y ? 1 : a.id < b.id ? -1 : 1;
};

/** Writes the static API into `outDir` (wiped first). Throws if data/ does not validate. */
export function build(outDir: string, now = new Date()) {
  const banks: Rec[] = readJson("data/banks.json");
  const ewallets: Rec[] = readJson("data/ewallets.json");
  const errors = validate(banks, ewallets);
  if (errors.length) throw new Error(`data/ is invalid:\n${errors.join("\n")}`);

  const version: string = readJson("package.json").version;
  const generated_at = now.toISOString();
  const all = [...banks, ...ewallets].sort(byDisplayName);
  const envelope = (data: Rec[]) => ({ version, generated_at, count: data.length, data });

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, "v1/by-id"), { recursive: true });
  const write = (path: string, value: unknown) => writeFileSync(join(outDir, path), JSON.stringify(value));

  write("v1/all.json", envelope(all));
  write("v1/banks.json", envelope(all.filter((r) => r.type === "bank")));
  write("v1/ewallets.json", envelope(all.filter((r) => r.type === "ewallet")));
  for (const r of all) write(`v1/by-id/${r.id}.json`, r);

  const counts = {
    all: all.length,
    banks: banks.length,
    ewallets: ewallets.length,
    verified: all.filter((r) => r.verified).length,
  };
  write("v1/meta.json", { version, generated_at, counts, sources: readJson("sources/hashes.json") });
  writeFileSync(join(outDir, "index.html"), indexHtml(version, generated_at, counts));
  return { version, generated_at, counts };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function indexHtml(version: string, generatedAt: string, counts: Record<string, number>) {
  const endpoints: [string, string][] = [
    ["v1/all.json", `All ${counts.all} institutions, sorted by display_name`],
    ["v1/banks.json", `${counts.banks} banks, bank brands and sharia units`],
    ["v1/ewallets.json", `${counts.ewallets} e-wallets`],
    ["v1/by-id/bca.json", "One record by id (replace <code>bca</code>)"],
    ["v1/meta.json", "Version, counts and hashes of the official source files"],
  ];
  const rows = endpoints.map(
    ([p, d]) => `<tr><td><a href="${p}"><code>/${p}</code></a></td><td>${d}</td></tr>`,
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Indonesian Bank Codes API</title>
<style>
:root{color-scheme:light dark;--fg:#1a1a1a;--muted:#5c5c5c;--bg:#fff;--line:#e2e2e2}
@media (prefers-color-scheme:dark){:root{--fg:#ececec;--muted:#a3a3a3;--bg:#141414;--line:#2e2e2e}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif}
main{max-width:46rem;margin:0 auto;padding:2.5rem 1rem}
h1{font-size:1.6rem;margin:0 0 .25rem}p.meta{color:var(--muted);margin:0 0 2rem}
table{width:100%;border-collapse:collapse}td{padding:.6rem .5rem;border-top:1px solid var(--line);vertical-align:top}
td:first-child{white-space:nowrap}a{color:inherit}code{font-size:.92em}
.wrap{overflow-x:auto}
</style>
</head>
<body>
<main>
<h1>Indonesian banks &amp; e-wallets</h1>
<p class="meta">Static JSON API · v${esc(version)} · generated ${esc(generatedAt)} · ${counts.verified} of ${counts.all} records verified</p>
<div class="wrap"><table>${rows.join("")}</table></div>
<p>Records with <code>"verified": false</code> have at least one field that is not yet confirmed against an official source; check them before relying on them.</p>
<p>This list helps users pick a bank or e-wallet. It cannot confirm that an account number belongs to a given holder name; that needs a paid account-inquiry API.</p>
</main>
</body>
</html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { version, counts } = build(join(root, "dist"));
  console.log(`✓ built dist/ v${version}: ${counts.all} records (${counts.verified} verified)`);
}
