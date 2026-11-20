# AGENTS.md

Static JSON API (plus npm package) listing Indonesian banks and e-wallets, for "pick a bank,
enter account number + holder name" forms. No server. Data is hand-reviewed; official sources are
synced on a schedule and changes arrive as PRs for review.

## Commands

```sh
pnpm install
pnpm validate        # schema + cross-record checks on data/*.json
pnpm test            # vitest
pnpm lint            # biome check (lint + format check)
pnpm format          # biome format --write
pnpm typecheck       # tsc --noEmit
pnpm sync:fetch      # download official sources to sources/raw/ and report hash changes (--write to record)
```

Run `pnpm validate && pnpm test && pnpm lint && pnpm typecheck` before considering a change done.

## Layout

- `data/banks.json`, `data/ewallets.json`: source of truth, arrays of records.
- `schema/institution.schema.json`: one record shape for both files.
- `scripts/validate.ts`: schema plus checks the schema can't express (unique id/bic/bank_code, references).
- `scripts/sync/`: `fetch-sources.ts` (download + SHA-256), `parse-*.ts` (PDF participant lists).
- `scripts/lib/pdf-table.ts`: shared strict parser for BI participant tables.
- `sources/hashes.json`: last-seen hash per source. `sources/raw/` is gitignored.
- `tests/fixtures/`: official files, named `<source>-<edition date>.pdf`.

## Data rules (non-negotiable)

- Never invent bank codes, BICs, or account-number formats. Unknown means `null` or omitted, plus
  `verified: false`.
- `id` values are permanent: never rename, reuse, or delete a published record. Mergers and
  rebrands set `status: "inactive"` and `merged_into`.
- Published `/v1` paths and fields are stable. Breaking changes go to `/v2`.
- Product brands (Jenius, TMRW, …) are their own records with `parent_id`. They may share the
  parent's `bank_code` and keep `bic: null`.
- Bank codes have no single official dataset: require two independent reputable sources, otherwise
  `verified: false`.

## Source quirks

- bi.go.id hangs on HEAD requests: always GET. The fetcher identifies itself honestly
  (`kode-bank-indonesia-sync/…`); do not spoof a browser.
- OJK's site rejects non-browser clients. It is a reference source checked by hand. Do not try to
  get around its firewall.
- **SKNBI PDF (edition 24 Sept 2026) is defective:** the Nama column (and probably the ✓ columns) is
  the BI-FAST name list pasted in order, so names don't match the BIC on the same row. Use SKNBI only
  as a list of member BICs. A test in `tests/parsers.test.ts` pins this. When it fails on a new
  edition, re-check whether names can be trusted again.
- Parsers must fail loudly on layout changes (row-count tests, strict line checks). Never relax a
  check just to make a new PDF parse; investigate the layout change first.

## Code conventions

- Node ≥ 22.18 runs `.ts` directly (native type stripping): erasable syntax only (no enums,
  namespaces, or parameter properties), and relative imports include the `.ts` extension.
- Scripts are importable modules with a CLI guard (`process.argv[1] === fileURLToPath(import.meta.url)`)
  so their logic can be unit-tested.
- Biome handles lint and format. Markdown is excluded from Biome.

## Working agreements

- Never push, publish to npm, create GitHub repos, or add secrets without asking first.
- `PLAN.md` holds local planning notes, is gitignored, and must never be committed.
- Conventional Commits (`type(scope): subject`, imperative, lowercase, ≤ 72 chars), one logical
  change per commit, no AI attribution or session links.
