---
title: Endpoint API
description: Daftar endpoint JSON statis, format respons, mirror CDN, dan jaminan stabilitas /v1.
---

Base URL: `https://dna-ardhi.github.io/kode-bank-indonesia`

| Path | Isi |
|---|---|
| `/v1/all.json` | Semua record: `{ version, generated_at, count, data: [...] }` |
| `/v1/banks.json` | Bank, brand bank, dan unit usaha syariah (format sama) |
| `/v1/ewallets.json` | E-wallet (format sama) |
| `/v1/by-id/{id}.json` | Satu record, misalnya `/v1/by-id/bca.json` |
| `/v1/meta.json` | Versi, jumlah record, dan hash file sumber resmi |

Semua endpoint adalah file statis. Nggak ada query string, paginasi, atau rate limit dari sisi kami. Tinggal di-cache sesukamu.

## Format respons

Endpoint daftar membungkus data dalam *envelope*:

```json
{
  "version": "1.0.0",
  "generated_at": "2026-11-20T16:58:48.699Z",
  "count": 132,
  "data": [ /* record, lihat struktur data */ ]
}
```

- `version` sama dengan versi paket npm.
- Daftar diurutkan menurut `display_name` (tanpa membedakan huruf besar-kecil), lalu `id`.
- `/v1/by-id/{id}.json` mengembalikan **satu record langsung**, tanpa envelope.

`/v1/meta.json` berisi `version`, `generated_at`, `counts` (`all`, `banks`, `ewallets`, `verified`), dan `sources` (SHA-256 tiap file sumber resmi yang dipakai).

## Mirror CDN

Paket npm yang sama juga disajikan lewat CDN:

- `https://cdn.jsdelivr.net/npm/kode-bank-indonesia@1/dist/v1/all.json`
- `https://unpkg.com/kode-bank-indonesia@1/dist/v1/all.json`

Tanda `@1` mengikuti rilis terbaru versi 1.x. Mau mengunci versi persis? Ganti dengan `@1.0.0`.

## Jaminan stabilitas

Path, field, dan `id` di `/v1` **stabil**. Perubahan yang merusak (breaking) akan masuk ke `/v2`, berdampingan dengan `/v1`, jadi integrasimu nggak tiba-tiba patah. Lihat [kebijakan versi](../../changelog/).
