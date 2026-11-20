# kode-bank-indonesia

Every bank and e-wallet in Indonesia, with 3-digit bank codes (sandi bank) and BICs, as a free
static JSON API and a typed npm package. Built for forms where a user picks a bank or e-wallet and
enters an account number and holder name.

> **Not included:** checking that an account number belongs to a holder name. That needs a paid
> account-inquiry API from a bank or payment provider. This list only helps users pick the right
> institution.

## Endpoints

Base URL: `https://dna-ardhi.github.io/kode-bank-indonesia`

| Path | Contents |
|---|---|
| `/v1/all.json` | All records: `{ version, generated_at, count, data: [...] }` |
| `/v1/banks.json` | Banks, bank brands and sharia units (same shape) |
| `/v1/ewallets.json` | E-wallets (same shape) |
| `/v1/by-id/{id}.json` | One record, e.g. `/v1/by-id/bca.json` |
| `/v1/meta.json` | Version, counts and hashes of the official source files |

Mirrors from the npm package: `https://cdn.jsdelivr.net/npm/kode-bank-indonesia@1/dist/v1/all.json`
and `https://unpkg.com/kode-bank-indonesia@1/dist/v1/all.json`.

`/v1` paths and fields are stable. Breaking changes will go to `/v2`.

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

The full definition is in [`schema/institution.schema.json`](schema/institution.schema.json).

### The `verified` flag

`verified: false` means at least one field isn't confirmed against an official source. Show these
records, but don't treat their `bank_code` as certain. Brand records (Jenius, TMRW, …) are always
unverified, because no official list names brands.

## License

MIT
