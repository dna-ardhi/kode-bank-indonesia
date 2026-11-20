# kode-bank-indonesia

Docs: [Bahasa Indonesia](https://dna-ardhi.github.io/kode-bank-indonesia/) · [English](https://dna-ardhi.github.io/kode-bank-indonesia/en/)

Every bank and e-wallet in Indonesia, with 3-digit bank codes (sandi bank) and BICs, as a free
static JSON API. Built for forms where a user picks a bank or e-wallet and
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

Lists are sorted by `display_name` (case-insensitive, then `id`).

`/v1` paths, fields and ids are stable. Breaking changes will go to `/v2`, next to `/v1`.

### Limits

The API is static files on GitHub Pages, so GitHub's limits apply:

- No rate limit of our own, but Pages has a soft bandwidth limit (about 100 GB/month) and may
  throttle (`429`) busy sites. It isn't meant as a backend for high-traffic or commercial services.
  For real traffic, fetch `all.json` once and serve your own copy.
- No SLA. Keep a saved copy of `all.json` as a fallback.
- Responses are cached for 10 minutes (`Cache-Control: max-age=600`, with `ETag`), so a new
  deploy can take about 10 minutes to show up. CORS is open (`*`).
- `GET`/`HEAD` only, no query strings or server-side filtering. An unknown
  `/v1/by-id/{id}.json` returns an HTML `404`, not JSON: check `res.ok`.

## Usage

### Fetch with a fallback

Fetch the live API, and keep your own copy of `all.json` for when the request fails:

```js
import fallback from "./all.json"; // a copy you saved from /v1/all.json

export async function loadInstitutions() {
  try {
    const res = await fetch("https://dna-ardhi.github.io/kode-bank-indonesia/v1/all.json", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return (await res.json()).data;
  } catch {
    // network error or timeout: use the saved copy
  }
  return fallback.data;
}
```

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
| [OJK head-office list, Bank Umum dan Syariah](https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah.aspx) (xlsx) | `bank_code` ("Sandi Bank") |
| [ASPI QRIS directory](https://aspi-indonesia.or.id/standar-dan-layanan/qris/) | Operator ↔ app name links, as review evidence for aliases and new e-wallets (no BICs or codes) |
| Published bank code lists | `bank_code` where OJK has no entry, and a cross-check |

`bank_code` is the "Sandi Bank" in OJK's head-office list. For records OJK doesn't list (sharia
units, brands), it is the code that most of eight published lists (Indonesian financial news sites
and a payment provider's docs) report, with at least two agreeing. Every vote, with the source URLs and the matched
lines, is recorded in [`sources/bank-codes.json`](sources/bank-codes.json).

Participants deliberately left out (Bank Indonesia itself, KSEI, and others) are listed with reasons
in [`sources/ignored-bics.json`](sources/ignored-bics.json).

## How it stays current

1. Every Monday at 02:00 UTC, the [sync workflow](.github/workflows/sync.yml) downloads the BI-FAST
   and SKNBI PDFs, OJK's bank list and ASPI's QRIS page, and compares their SHA-256 hashes with
   [`sources/hashes.json`](sources/hashes.json).
2. If a source changed, it parses it and compares it with `data/`. It opens a pull request with the
   proposed changes and a report. Every touched record is set to `verified: false`, and nothing is
   deleted or deactivated automatically. A patch version bump is included when `data/` changed.
3. Two low-risk changes are applied by the sync itself: an OJK code for a bank that had none, and
   ASPI app names as aliases of a matched record. If a run contains **only** those (or nothing but a
   hash change), the PR merges itself once CI passes. This needs a `SYNC_TOKEN` secret, because PRs
   opened with the default token don't run CI.
4. Anything else (new, removed or renamed participants, an OJK code that disagrees with ours, an OJK
   bank we don't have) waits for a maintainer, who fills in what can't be automated (category,
   display name, bank code evidence) and merges it.
5. Merging to `main` redeploys GitHub Pages.

If the download or the parser fails, for example because Bank Indonesia changed the PDF layout,
the workflow opens an issue labelled `sync-failure` instead of a PR.

## Versioning

The dataset follows semver, and its version is the `version` field in every API response.

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
| `pnpm sync:fetch` | Downloads the official PDFs and reports hash changes |
| `pnpm sync:diff` | Compares the downloaded PDFs with `data/` |
| `pnpm docs:dev` / `pnpm docs:build` | Runs / builds the docs site (needs Node ≥ 22.23.4) |

## License

[MIT](LICENSE). The data comes from public lists by Bank Indonesia and the sources above. Check
critical values with the bank before moving money.
