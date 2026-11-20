---
title: Paket npm
description: Ekspor, tipe TypeScript, fungsi search, dan syarat versi Node untuk paket kode-bank-indonesia.
---

```sh
npm install kode-bank-indonesia
```

```ts
import { all, banks, ewallets, findById, search, type Institution } from "kode-bank-indonesia";
```

## Ekspor

| Ekspor | Keterangan |
|---|---|
| `all`, `banks`, `ewallets` | Array record *read-only*, urutannya sama dengan API |
| `findById(id)` | Satu record, atau `undefined` kalau `id`-nya nggak ada |
| `search(query)` | Mencari di `display_name`, `aliases`, `name`, dan `id` tanpa peduli huruf besar-kecil, tanda baca, dan aksen. Juga cocok persis dengan `bank_code` dan BIC. Query kosong mengembalikan semua record. Record `inactive` ikut tampil. |
| `Institution`, `AccountNumber`, `Category`, `InstitutionType`, `Status` | Tipe TypeScript |

## Cara kerja `search()`

Hasilnya diurutkan menurut kecocokan:

1. **Persis sama** (termasuk kode bank atau BIC yang persis)
2. **Diawali** query
3. **Mengandung** query

Kalau kecocokannya setara, urutan mengikuti `display_name`. Untuk dropdown pilihan bank, biasanya kamu mau menyembunyikan institusi yang sudah nggak aktif:

```ts
const pilihan = search(query).filter((r) => r.status === "active");
```

## Syarat lingkungan

Paket ini **ESM-only**. Datanya diimpor dengan `import … with { type: "json" }`, jadi butuh **Node ≥ 20.10** atau bundler modern (Vite, esbuild, webpack 5, Rollup).

## Data ikut terpaket

Folder `dist/v1/` ada di dalam paket. Itu sebabnya mirror CDN bisa menyajikan JSON yang sama dengan GitHub Pages, dan kenapa `import { all }` bekerja tanpa koneksi internet.

Versi paket sama dengan field `version` di setiap respons API. Aturan penomoran versi ada di [changelog](../../changelog/).
