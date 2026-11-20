# kode-bank-indonesia

Every bank and e-wallet in Indonesia, with 3-digit bank codes (sandi bank) and BICs, as a free
static JSON API and a typed npm package. Built for forms where a user picks a bank or e-wallet and
enters an account number and holder name.

> **Not included:** checking that an account number belongs to a holder name. That needs a paid
> account-inquiry API from a bank or payment provider. This list helps users pick the right
> institution; it can't tell you whether "1234567890 / Budi Santoso" is a real account.

## Endpoints

Base URL: `https://dna-ardhi.github.io/kode-bank-indonesia`

| Path | Contents |
|---|---|
| `/v1/all.json` | All records: `{ version, generated_at, count, data: [...] }` |
| `/v1/banks.json` | Banks, bank brands and sharia units (same shape) |
| `/v1/ewallets.json` | E-wallets (same shape) |
| `/v1/by-id/{id}.json` | One record, e.g. `/v1/by-id/bca.json` |
| `/v1/meta.json` | Version, counts and hashes of the official source files |

Lists are sorted by `display_name` (case-insensitive, then `id`). The npm package also serves the
same files from CDN mirrors:

- `https://cdn.jsdelivr.net/npm/kode-bank-indonesia@1/dist/v1/all.json`
- `https://unpkg.com/kode-bank-indonesia@1/dist/v1/all.json`

`/v1` paths, fields and ids are stable. Breaking changes will go to `/v2`, next to `/v1`.

## Usage

### Fetch with fallbacks

Try GitHub Pages, then jsDelivr, then the data bundled in the npm package:

```js
import { all as bundled } from "kode-bank-indonesia";

const URLS = [
  "https://dna-ardhi.github.io/kode-bank-indonesia/v1/all.json",
  "https://cdn.jsdelivr.net/npm/kode-bank-indonesia@1/dist/v1/all.json",
];

export async function loadInstitutions() {
  for (const url of URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return (await res.json()).data;
    } catch {
      // try the next mirror
    }
  }
  return bundled;
}
```

Without the npm package, drop the import and the last line, and handle the error yourself.

### npm package

```sh
npm install kode-bank-indonesia
```

```ts
import { all, banks, ewallets, findById, search, type Institution } from "kode-bank-indonesia";

findById("bca")?.bank_code; // "014"
search("mandiri"); // exact matches first, then prefix, then substring
search("014"); // bank code or BIC, exact
const choices = search(query).filter((r) => r.status === "active");
```

| Export | |
|---|---|
| `all`, `banks`, `ewallets` | Read-only arrays of records, sorted like the API |
| `findById(id)` | One record, or `undefined` |
| `search(query)` | Matches `display_name`, `aliases`, `name` and `id`, ignoring case, punctuation and accents; also exact `bank_code` and BIC. An empty query returns everything. Includes inactive records. |
| `Institution`, `AccountNumber`, `Category`, `InstitutionType`, `Status` | Types |

The package is ESM-only. It imports its data with `import … with { type: "json" }`, which needs
Node ≥ 20.10 or a current bundler (Vite, esbuild, webpack 5, Rollup).

## Record shape

```json
{
  "id": "bca",
  "type": "bank",
  "category": "commercial",
  "name": "PT. BANK CENTRAL ASIA Tbk.",
  "display_name": "BCA",
  "aliases": ["Bank Central Asia"],
  "parent_id": null,
  "bank_code": "014",
  "bic": "CENAIDJA",
  "bi_fast": true,
  "sknbi": true,
  "account_number": { "kind": "account", "label": "Nomor rekening" },
  "logo": null,
  "status": "active",
  "merged_into": null,
  "sources": ["bi-fast", "sknbi"],
  "verified": true,
  "updated_at": "2026-11-20"
}
```

| Field | Meaning |
|---|---|
| `id` | Stable kebab-case slug. Never renamed or reused. |
| `type` | `bank` or `ewallet` |
| `category` | Banks: `commercial`, `sharia`, `sharia-unit` (a bank's sharia business unit, UUS), `regional` (BPD), `foreign` (branch of a foreign bank), `digital`. E-wallets: `ewallet`. |
| `name` | Legal name exactly as Bank Indonesia's BI-FAST list writes it; for e-wallets, the operator's legal name |
| `display_name`, `aliases` | What to show users, and other names to match in search |
| `parent_id` | For brands (Jenius, TMRW, digibank, LINE Bank) and sharia units: the bank they belong to |
| `bank_code` | 3-digit sandi bank as a string, leading zeros kept. `null` when no code could be confirmed. Brands use their parent's code. |
| `bic` | BIC/SWIFT code from the BI-FAST list. `null` for brands and some e-wallets. |
| `sknbi_bic` | Present only when the SKNBI list uses a different BIC than `bic` |
| `bi_fast`, `sknbi` | Whether the institution is a BI-FAST / SKNBI participant (brands mirror their parent) |
| `account_number` | `kind` (`account` or `phone`) and a form `label`. `min_length`, `max_length` and `pattern` appear only when confirmed; none are yet. |
| `logo` | Reserved; always `null` for now |
| `status`, `merged_into` | `active` or `inactive`. Merged or rebranded institutions stay listed as `inactive`, with `merged_into` pointing to the successor. |
| `sources` | Which official lists the record appears in (`bi-fast`, `sknbi`) |
| `verified` | See below |
| `updated_at` | Date the record last changed (YYYY-MM-DD) |

The full definition is in [`schema/institution.schema.json`](schema/institution.schema.json).

### The `verified` flag

`verified: true` means the name and BIC come from Bank Indonesia's BI-FAST participant list, and
the bank code is reported consistently by independent published lists (details below).
`verified: false` means at least one field isn't confirmed that way. Show these records, but don't
treat their `bank_code` as certain. Always unverified:

- brands (no official list names them),
- most sharia units (their codes aren't published),
- banks linked to a code only through a former name,
- e-wallets whose brand-to-operator link hasn't been checked against Bank Indonesia's licence
  register (all except DANA, whose BIC carries its name).

`display_name`, `aliases` and `category` are editorial and not covered by the flag.

## Where the data comes from

| Source | Used for |
|---|---|
| [BI-FAST participant list](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-BI-FAST.pdf) (Bank Indonesia, PDF) | Names, BICs, `bi_fast` |
| [SKNBI participant list](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-SKNBI.pdf) (Bank Indonesia, PDF) | `sknbi` membership by BIC only. The current edition's name column doesn't line up with its BICs, so its names aren't used. |
| [BI licensed payment providers](https://www.bi.go.id/id/layanan/informasi-perizinan/sistem-pembayaran/default.aspx) | E-wallet operators (checked by hand) |
| [OJK banking directory](https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/direktori-perbankan-indonesia) | Reference (checked by hand) |
| Published bank code lists | `bank_code` |

There is no official machine-readable list of 3-digit bank codes. Each `bank_code` is the code that
most of eight published lists (Indonesian financial news sites and a payment provider's docs)
report for that bank, with at least two agreeing. Every vote, with the source URLs and the matched
lines, is recorded in [`sources/bank-codes.json`](sources/bank-codes.json).

Participants deliberately left out (Bank Indonesia itself, KSEI, and others) are listed with reasons
in [`sources/ignored-bics.json`](sources/ignored-bics.json).

## How it stays current

1. Every Monday at 02:00 UTC, the [sync workflow](.github/workflows/sync.yml) downloads the BI-FAST
   and SKNBI PDFs and compares their SHA-256 hashes with
   [`sources/hashes.json`](sources/hashes.json).
2. If a file changed, it parses it and compares it with `data/`. It opens a pull request with the
   proposed changes and a report of added, removed and renamed participants. Every touched record
   is set to `verified: false`, and nothing is deleted or deactivated automatically.
3. A maintainer reviews the PR, fills in what can't be automated (category, display name, bank
   code evidence), and merges it.
4. Merging to `main` redeploys GitHub Pages. A new npm version updates the CDN mirrors.

If the download or the parser fails, for example because Bank Indonesia changed the PDF layout,
the workflow opens an issue labelled `sync-failure` instead of a PR.

## Versioning

The npm package follows semver, and its version is the `version` field in every API response.

- **Patch:** data changes (new, corrected or deactivated records).
- **Minor:** new optional fields or endpoints.
- **Major:** breaking changes, which also get a new `/vN` path.

## Contributing

Corrections are very welcome, especially bank codes with evidence, account number formats, and
e-wallet operator names checked against Bank Indonesia's licence register.

```sh
git clone https://github.com/dna-ardhi/kode-bank-indonesia.git
cd kode-bank-indonesia
pnpm install
pnpm validate && pnpm lint && pnpm typecheck && pnpm test
```

Development needs Node ≥ 22.18 (see `.nvmrc`) and [pnpm](https://pnpm.io/installation); the
pnpm version is pinned in `package.json`.

Rules for data changes:

- Edit `data/banks.json` or `data/ewallets.json`, and keep `pnpm validate` passing.
- Never guess. A bank code, BIC or account format you can't back up stays `null` (or omitted), and
  the record stays `verified: false`. For a new or changed `bank_code`, add the evidence to
  `sources/bank-codes.json` and link the sources in your PR.
- Never rename, reuse or delete an `id`. To retire a record, set `status: "inactive"` and
  `merged_into`.
- Keep `name` exactly as the BI-FAST list writes it, so the sync can match it.
- Use [Conventional Commits](https://www.conventionalcommits.org/), e.g. `fix(data): correct bank
  code for bank-x`.

Repository layout and conventions for contributors (and coding agents) are in
[`AGENTS.md`](AGENTS.md).

| Command | |
|---|---|
| `pnpm validate` | Schema and cross-record checks on `data/` |
| `pnpm test` | Builds `dist/`, then runs the test suite |
| `pnpm build` | Writes the static API to `dist/` |
| `pnpm build:lib` | Compiles the npm package to `lib/` |
| `pnpm sync:fetch` | Downloads the official PDFs and reports hash changes |
| `pnpm sync:diff` | Compares the downloaded PDFs with `data/` |

## License

[MIT](LICENSE). The data comes from public lists by Bank Indonesia and the sources above. Check
critical values with the bank before moving money.
