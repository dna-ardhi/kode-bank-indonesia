---
title: API endpoints
description: Static JSON endpoints, response format, CDN mirrors, and the /v1 stability promise.
---

Base URL: `https://dna-ardhi.github.io/kode-bank-indonesia`

| Path | Contents |
|---|---|
| `/v1/all.json` | All records: `{ version, generated_at, count, data: [...] }` |
| `/v1/banks.json` | Banks, bank brands and sharia units (same shape) |
| `/v1/ewallets.json` | E-wallets (same shape) |
| `/v1/by-id/{id}.json` | One record, e.g. `/v1/by-id/bca.json` |
| `/v1/meta.json` | Version, counts and hashes of the official source files |

Everything is a static file. There are no query strings, pagination or rate limits on our side. Cache as you like.

## Response format

List endpoints wrap the data in an *envelope*:

```json
{
  "version": "1.0.0",
  "generated_at": "2026-11-20T16:58:48.699Z",
  "count": 132,
  "data": [ /* records, see the data schema */ ]
}
```

- `version` matches the npm package version.
- Lists are sorted by `display_name` (case-insensitive), then `id`.
- `/v1/by-id/{id}.json` returns **one bare record**, with no envelope.

`/v1/meta.json` holds `version`, `generated_at`, `counts` (`all`, `banks`, `ewallets`, `verified`) and `sources` (the SHA-256 of each official source file in use).

## CDN mirrors

The npm package is also served through CDNs:

- `https://cdn.jsdelivr.net/npm/kode-bank-indonesia@1/dist/v1/all.json`
- `https://unpkg.com/kode-bank-indonesia@1/dist/v1/all.json`

`@1` follows the latest 1.x release. To pin an exact version, use `@1.0.0` instead.

## Stability promise

`/v1` paths, fields and ids are **stable**. Breaking changes will go to `/v2`, next to `/v1`, so your integration won't suddenly break. See the [versioning policy](../../changelog/).
