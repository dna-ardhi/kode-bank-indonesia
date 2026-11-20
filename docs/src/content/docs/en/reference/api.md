---
title: API endpoints
description: Static JSON endpoints, response format, GitHub Pages limits, and the /v1 stability promise.
---

Base URL: `https://dna-ardhi.github.io/kode-bank-indonesia`

| Path | Contents |
|---|---|
| `/v1/all.json` | All records: `{ version, generated_at, count, data: [...] }` |
| `/v1/banks.json` | Banks, bank brands and sharia units (same shape) |
| `/v1/ewallets.json` | E-wallets (same shape) |
| `/v1/bprs.json` | Rural banks (BPR and BPRS, from OJK). **Not** part of `all.json` or `banks.json`, so existing pickers don't change (same shape) |
| `/v1/by-id/{id}.json` | One record, e.g. `/v1/by-id/bca.json` |
| `/v1/meta.json` | Version, counts and hashes of the official source files |

Everything is a static file served by GitHub Pages. There are no query strings or pagination. See [Limits](#limits) for what that means in practice.

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

- `version` is the dataset version (see the [changelog](../../changelog/)).
- Lists are sorted by `display_name` (case-insensitive), then `id`.
- `/v1/by-id/{id}.json` returns **one bare record**, with no envelope. It also serves BPR/BPRS records (e.g. `bpr-600001`).

`/v1/meta.json` holds `version`, `generated_at`, `counts` (`all`, `banks`, `ewallets`, `bprs`, `verified`) and `sources` (the SHA-256 of each official source file in use).

## Limits

This API is plain GitHub Pages: no server, no API keys, and nothing we can tune per request.

| Topic | What to expect |
|---|---|
| **Rate limit** | We don't enforce one and there is no published requests-per-second number. GitHub Pages has a [soft bandwidth limit of about 100 GB/month](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) per site. If a site goes over, GitHub may throttle it (HTTP `429`) or ask the owner to cut traffic. |
| **Intended use** | GitHub does not allow Pages as a backend for high-traffic or commercial services. Don't call the API once per user request in a busy app. |
| **Availability** | No SLA or uptime guarantee. Keep a saved copy of `all.json` as a fallback (see [Quick start](../../quick-start/)). |
| **Caching** | Responses carry `Cache-Control: max-age=600` (10 minutes) plus `ETag` and `Last-Modified`, so conditional requests return `304`. You can't change these headers. |
| **Freshness** | Data changes only when a reviewed change is merged and Pages redeploys (see [updates](../../data/updates/)). A new deploy can take up to about 10 minutes to show up because of the CDN cache. |
| **CORS** | `Access-Control-Allow-Origin: *`, so you can call it straight from any browser origin. |
| **Methods** | `GET` and `HEAD` only. No query strings, filtering, sorting or pagination: fetch `all.json` and filter on the client. |
| **Size** | `all.json` is about 53 KB, about 5 KB gzipped. Brotli isn't offered. |
| **Missing ids** | `/v1/by-id/{id}.json` for an unknown id returns HTTP `404` with an **HTML** page, not JSON. Check `res.ok` before calling `res.json()`. |

For anything with real traffic, fetch `all.json` once (at build time or on server start, and refresh now and then) and serve your own copy instead of calling Pages for every user.

## Stability promise

`/v1` paths, fields and ids are **stable**. Breaking changes will go to `/v2`, next to `/v1`, so your integration won't suddenly break. See the [versioning policy](../../changelog/).
