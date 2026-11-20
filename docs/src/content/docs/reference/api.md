---
title: Endpoint API
description: Daftar endpoint JSON statis, format respons, batasan GitHub Pages, dan jaminan stabilitas /v1.
---

Base URL: `https://dna-ardhi.github.io/kode-bank-indonesia`

| Path | Isi |
|---|---|
| `/v1/all.json` | Semua record: `{ version, generated_at, count, data: [...] }` |
| `/v1/banks.json` | Bank, brand bank, dan unit usaha syariah (format sama) |
| `/v1/ewallets.json` | E-wallet (format sama) |
| `/v1/bprs.json` | Bank rakyat (BPR dan BPRS, dari OJK). **Nggak** termasuk di `all.json` atau `banks.json`, jadi picker yang sudah ada nggak berubah (format sama) |
| `/v1/by-id/{id}.json` | Satu record, misalnya `/v1/by-id/bca.json` |
| `/v1/meta.json` | Versi, jumlah record, dan hash file sumber resmi |

Semua endpoint adalah file statis yang disajikan GitHub Pages. Nggak ada query string atau paginasi. Lihat [Batasan](#batasan) untuk dampaknya.

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

- `version` adalah versi dataset (lihat [changelog](../../changelog/)).
- Daftar diurutkan menurut `display_name` (tanpa membedakan huruf besar-kecil), lalu `id`.
- `/v1/by-id/{id}.json` mengembalikan **satu record langsung**, tanpa envelope.

`/v1/meta.json` berisi `version`, `generated_at`, `counts` (`all`, `banks`, `ewallets`, `bprs`, `verified`), dan `sources` (SHA-256 tiap file sumber resmi yang dipakai).

## Batasan

API ini cuma GitHub Pages biasa: nggak ada server, nggak ada API key, dan nggak ada yang bisa kami atur per request.

| Topik | Yang perlu kamu tahu |
|---|---|
| **Rate limit** | Kami nggak memberlakukan rate limit dan nggak ada angka request per detik yang dipublikasikan. GitHub Pages punya [batas bandwidth lunak sekitar 100 GB/bulan](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) per situs. Kalau terlewati, GitHub bisa membatasi (HTTP `429`) atau meminta pemilik situs menurunkan trafik. |
| **Peruntukan** | GitHub tidak mengizinkan Pages dipakai sebagai backend layanan komersial atau trafik tinggi. Jangan panggil API ini di setiap request pengguna pada aplikasi yang ramai. |
| **Ketersediaan** | Tanpa SLA atau jaminan uptime. Simpan salinan `all.json` sebagai cadangan (lihat [Mulai cepat](../../quick-start/)). |
| **Cache** | Respons membawa `Cache-Control: max-age=600` (10 menit) plus `ETag` dan `Last-Modified`, jadi conditional request dibalas `304`. Header ini nggak bisa kamu ubah. |
| **Kesegaran data** | Data berubah hanya setelah perubahan yang sudah di-review di-merge dan Pages deploy ulang (lihat [pembaruan](../../data/updates/)). Deploy baru bisa butuh sekitar 10 menit untuk muncul karena cache CDN. |
| **CORS** | `Access-Control-Allow-Origin: *`, jadi bisa dipanggil langsung dari origin browser mana pun. |
| **Method** | Hanya `GET` dan `HEAD`. Nggak ada query string, filter, sort, atau paginasi: ambil `all.json` lalu filter di sisi klien. |
| **Ukuran** | `all.json` sekitar 53 KB, sekitar 5 KB setelah gzip. Brotli tidak tersedia. |
| **Id tidak ada** | `/v1/by-id/{id}.json` untuk id yang tidak ada mengembalikan HTTP `404` dengan halaman **HTML**, bukan JSON. Cek `res.ok` sebelum memanggil `res.json()`. |

Untuk aplikasi dengan trafik nyata, ambil `all.json` sekali (saat build atau saat server start, lalu perbarui sesekali) dan layani salinanmu sendiri, jangan panggil Pages di setiap request pengguna.

## Jaminan stabilitas

Path, field, dan `id` di `/v1` **stabil**. Perubahan yang merusak (breaking) akan masuk ke `/v2`, berdampingan dengan `/v1`, jadi integrasimu nggak tiba-tiba patah. Lihat [kebijakan versi](../../changelog/).
