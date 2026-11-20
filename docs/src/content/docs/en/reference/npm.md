---
title: npm package
description: Exports, TypeScript types, the search function, and Node requirements for kode-bank-indonesia.
---

```sh
npm install kode-bank-indonesia
```

```ts
import { all, banks, ewallets, findById, search, type Institution } from "kode-bank-indonesia";
```

## Exports

| Export | Notes |
|---|---|
| `all`, `banks`, `ewallets` | Read-only arrays of records, sorted like the API |
| `findById(id)` | One record, or `undefined` if the `id` doesn't exist |
| `search(query)` | Matches `display_name`, `aliases`, `name` and `id`, ignoring case, punctuation and accents; also matches `bank_code` and BIC exactly. An empty query returns everything. Includes `inactive` records. |
| `Institution`, `AccountNumber`, `Category`, `InstitutionType`, `Status` | TypeScript types |

## How `search()` ranks results

Results are ordered by how well they match:

1. **Exact** (including an exact bank code or BIC)
2. **Prefix**
3. **Substring**

Ties keep the `display_name` order. For a bank picker, you'll usually want to hide institutions that are no longer active:

```ts
const choices = search(query).filter((r) => r.status === "active");
```

## Requirements

The package is **ESM-only**. It imports its data with `import … with { type: "json" }`, which needs **Node ≥ 20.10** or a current bundler (Vite, esbuild, webpack 5, Rollup).

## Data ships in the package

The `dist/v1/` folder is part of the package. That's why the CDN mirrors can serve the same JSON as GitHub Pages, and why `import { all }` works offline.

The package version equals the `version` field in every API response. The numbering rules are in the [changelog](../../changelog/).
