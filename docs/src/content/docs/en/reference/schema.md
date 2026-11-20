---
title: Data schema
description: The shape of one institution record, what each field means, and the list of categories.
---

Banks and e-wallets share one record shape. Here is BCA:

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

## Fields

| Field | Meaning |
|---|---|
| `id` | Stable kebab-case slug. Never renamed or reused. |
| `type` | `bank` or `ewallet` |
| `category` | See the category table below |
| `name` | Legal name exactly as Bank Indonesia's BI-FAST list writes it; for e-wallets, the operator's legal name |
| `display_name`, `aliases` | What to show users, and other names to match in search |
| `parent_id` | For brands (Jenius, TMRW, digibank, LINE Bank) and sharia units: the bank they belong to |
| `bank_code` | 3-digit sandi bank as a string, leading zeros kept. `null` when no code could be confirmed. Brands use their parent's code. |
| `bic` | BIC/SWIFT code from the BI-FAST list. `null` for brands and some e-wallets. |
| `sknbi_bic` | Present only when the SKNBI list uses a different BIC than `bic` |
| `ojk_code` | Present only on BPR/BPRS: the 6-digit OJK sandi. Not a transfer code; `bank_code` stays `null` for these. |
| `bi_fast`, `sknbi` | Whether the institution is a BI-FAST / SKNBI participant (brands mirror their parent) |
| `account_number` | `kind` (`account` or `phone`) and a form `label`. `min_length`, `max_length` and `pattern` appear only when confirmed; none are yet. |
| `logo` | Reserved; always `null` for now |
| `status`, `merged_into` | `active` or `inactive`. Merged or rebranded institutions stay listed as `inactive`, with `merged_into` pointing to the successor. |
| `sources` | Which official lists the record appears in (`bi-fast`, `sknbi`) |
| `verified` | See the [verified flag](../verified/) |
| `updated_at` | Date the record last changed (YYYY-MM-DD) |

## Categories

| `category` | For |
|---|---|
| `commercial` | Commercial banks |
| `sharia` | Sharia banks |
| `sharia-unit` | A conventional bank's sharia business unit (UUS) |
| `regional` | Regional development banks (BPD) |
| `foreign` | Branches of foreign banks |
| `digital` | Digital banks |
| `bpr`, `bprs` | Rural banks (BPR) and sharia rural banks (BPRS), only in `/v1/bprs.json` |
| `ewallet` | E-wallets (only for `type: "ewallet"`) |

The full definition is in [`schema/institution.schema.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/schema/institution.schema.json) (JSON Schema 2020-12).

## Brands and sharia units

- A **brand** (e.g. Jenius) is its own record with a `parent_id`, `bic: null`, and its parent's `bank_code`. Brands are always `verified: false`, because no official list names them.
- A **sharia unit** has its own BIC and a `parent_id`, but does **not** inherit its parent's code. Its code is only filled in when there is evidence.
