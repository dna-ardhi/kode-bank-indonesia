# AGENTS.md

Static JSON API (plus npm package) listing Indonesian banks and e-wallets, for "pick a bank,
enter account number + holder name" forms. No server. Data is hand-reviewed; official sources are
synced on a schedule and changes arrive as PRs for review.

## Commands

```sh
pnpm install
pnpm validate        # schema + cross-record checks on data/*.json
pnpm test            # builds dist/, then vitest (the package tests import dist/v1/all.json)
pnpm lint            # biome check (lint + format check)
pnpm format          # biome format --write
pnpm typecheck       # tsc --noEmit
pnpm build           # data/ -> dist/ (static API; refuses invalid data, wipes dist/ first)
pnpm build:lib       # compile the npm package src/ -> lib/
pnpm sync:fetch      # download official sources to sources/raw/ and report hash changes (--write to record)
pnpm sync:diff       # parse sources/raw/ PDFs, diff against data/ (--write to apply, --report <file>)
```

Run `pnpm validate && pnpm test && pnpm lint && pnpm typecheck` before considering a change done.

## Layout

- `data/banks.json`, `data/ewallets.json`: source of truth, arrays of records.
- `schema/institution.schema.json`: one record shape for both files.
- `scripts/build.ts`: writes `dist/v1/*` (minified, sorted by lowercase `display_name`, then `id`) and `dist/index.html`. `/v1` paths are pinned by `tests/build.test.ts`.
- `src/index.ts`: the npm package, compiled by `tsc -p tsconfig.build.json` into `lib/`
  (gitignored; `pnpm build:lib`, run by `prepack`). It imports `dist/v1/all.json`, so build `dist/`
  first. `src/data.d.ts` lets the build config skip the JSON so tsc doesn't copy it into `lib/`; the
  tarball ships the data once, in `dist/`. `tests/types.test.ts` fails when the types drift from
  the schema.
- `scripts/validate.ts`: schema plus checks the schema can't express (unique id/bic/bank_code, references).
- `scripts/sync/`: `fetch-sources.ts` (download + SHA-256), `parse-*.ts` (PDF participant lists),
  `diff.ts` (proposes record changes, all `verified: false`; never deletes or deactivates).
- `.github/workflows/`: `ci.yml` (PRs and main, Node 22 + 24), `deploy-pages.yml` (main → Pages),
  `sync.yml` (Mondays 02:00 UTC: PR on source changes, issue labelled `sync-failure` on failure),
  `publish-npm.yml` (`v*` tag → npm with provenance; tag must equal the package.json version).
- `scripts/lib/pdf-table.ts`: shared strict parser for BI participant tables.
- `sources/hashes.json`: last-seen hash per source. `sources/raw/` is gitignored.
- `sources/bank-codes.json`: evidence for every `bank_code` (publisher URLs, matched lines, votes).
- `sources/ignored-bics.json`: BI participants deliberately not published as banks, with reasons.
- `tests/fixtures/`: official files, named `<source>-<edition date>.pdf`.

## Data rules (non-negotiable)

- Never invent bank codes, BICs, or account-number formats. Unknown means `null` or omitted, plus
  `verified: false`.
- `id` values are permanent: never rename, reuse, or delete a published record. Mergers and
  rebrands set `status: "inactive"` and `merged_into`.
- Published `/v1` paths and fields are stable. Breaking changes go to `/v2`.
- Product brands (Jenius, TMRW, …) are their own records with `parent_id`. They may share the
  parent's `bank_code` and keep `bic: null`.
- Bank codes have no single official dataset. `bank_code` is the code most publishers in
  `sources/bank-codes.json` report (at least 2, no tie). It counts as confirmed only when no rival
  code has 2 or more publishers. Many of those news lists copy each other, so treat agreement as
  evidence, not proof.
- `verified: true` means: name and BIC come from the BI-FAST list, the bank code is confirmed as
  above, and no field relies on our own knowledge. Records linked to the code lists only through
  a former name or a BIC prefix (Superbank, Krom, Saqu, Amar, Bank Syariah Nasional, Bank Kalsel),
  brands, and e-wallets whose operator isn't named by its BIC all stay `verified: false`.
  `display_name`, `aliases` and `category` are editorial and not covered by the flag.
- `name` is the BI-FAST name verbatim (e.g. `PT. BANK CENTRAL ASIA Tbk.`), so the sync diff can
  detect renames by exact comparison.
- `bic` is the BI-FAST BIC. `sknbi_bic` is set only when SKNBI uses a different BIC for the same
  bank. Both share one namespace in the validator.
- Sharia business units (UUS) are `sharia-unit` records with their own BIC and `parent_id`. Their
  `bank_code` comes from evidence only and is not inherited, because e.g. Bank DKI Syariah is
  listed with its own code.

## Source quirks

- bi.go.id hangs on HEAD requests: always GET. The fetcher identifies itself honestly
  (`kode-bank-indonesia-sync/…`); do not spoof a browser.
- OJK's site rejects non-browser clients. It is a reference source checked by hand. Do not try to
  get around its firewall.
- BI's licensed payment provider register (`bi-pjp`):
  https://www.bi.go.id/id/layanan/informasi-perizinan/sistem-pembayaran/default.aspx. It is an
  ASP.NET list with an "Unduh" export and a product-name search. The server starts resetting
  connections after a few scripted form posts, so check e-wallet operators by hand and don't
  automate it.
- **SKNBI PDF (edition 24 Sept 2026) is defective:** the Nama column (and probably the ✓ columns) is
  the BI-FAST name list pasted in order, so names don't match the BIC on the same row. Use SKNBI only
  as a list of member BICs. A test in `tests/parsers.test.ts` pins this. When it fails on a new
  edition, re-check whether names can be trusted again.
- Parsers must fail loudly on layout changes (row-count tests, strict line checks). Never relax a
  check just to make a new PDF parse; investigate the layout change first.

## Code conventions

- Development needs Node ≥ 22.18 (`.nvmrc`); the published package needs Node ≥ 20.10
  (`engines`). Node ≥ 22.18 runs `.ts` directly (native type stripping): erasable syntax only (no enums,
  namespaces, or parameter properties), and relative imports include the `.ts` extension.
- Scripts are importable modules with a CLI guard (`process.argv[1] === fileURLToPath(import.meta.url)`)
  so their logic can be unit-tested.
- Biome handles lint and format. Markdown is excluded from Biome.

## Working agreements

- Never push, publish to npm, create GitHub repos, or add secrets without asking first.
- `PLAN.md` holds local planning notes, is gitignored, and must never be committed.
- Conventional Commits (`type(scope): subject`, imperative, lowercase, ≤ 72 chars), one logical
  change per commit, no AI attribution or session links.
