---
title: Kontribusi
description: Cara menjalankan proyek di lokal, aturan mengubah data, dan konvensi commit.
---

Koreksi sangat disambut, terutama **kode bank beserta buktinya**, **format nomor rekening**, dan **nama operator e-wallet yang sudah dicek** ke register izin Bank Indonesia.

## Menjalankan di lokal

```sh
git clone https://github.com/dna-ardhi/kode-bank-indonesia.git
cd kode-bank-indonesia
pnpm install
pnpm validate && pnpm lint && pnpm typecheck && pnpm test
```

Kamu butuh **Node ≥ 22.18** (lihat `.nvmrc`) dan [pnpm](https://pnpm.io/installation). Versi pnpm sudah dikunci di `package.json`. Untuk menjalankan situs dokumentasi ini kamu butuh **Node ≥ 22.23.4**.

## Aturan mengubah data

- Edit `data/banks.json` atau `data/ewallets.json`, dan pastikan `pnpm validate` tetap lolos.
- **Jangan menebak.** Kode bank, BIC, atau format rekening yang nggak bisa kamu buktikan tetap `null` (atau dihilangkan), dan recordnya tetap `verified: false`. Untuk `bank_code` baru atau berubah, tambahkan buktinya ke `sources/bank-codes.json` dan cantumkan sumbernya di PR.
- **Jangan mengganti nama, memakai ulang, atau menghapus `id`.** Untuk mempensiunkan record, set `status: "inactive"` dan `merged_into`.
- Biarkan `name` **persis** seperti tertulis di daftar BI-FAST, supaya sinkronisasi bisa mendeteksi perubahan nama.
- Pakai [Conventional Commits](https://www.conventionalcommits.org/), misalnya `fix(data): correct bank code for bank-x`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm validate` | Cek skema dan konsistensi antar-record di `data/` |
| `pnpm test` | Membangun `dist/`, lalu menjalankan seluruh tes |
| `pnpm build` | Menulis API statis ke `dist/` |
| `pnpm sync:fetch` | Mengunduh PDF resmi dan melaporkan perubahan hash |
| `pnpm sync:diff` | Membandingkan PDF yang diunduh dengan `data/` |
| `pnpm docs:dev` | Menjalankan situs dokumentasi ini di lokal |
| `pnpm docs:build` | Membangun situs dokumentasi ini ke `docs/dist/` |

## Menulis dokumentasi

Isi dokumentasi ada di `docs/src/content/docs/`. Halaman berbahasa Indonesia ada di root (bahasa utama), dan versi Inggrisnya di `en/` dengan **path yang sama persis**. Setiap perubahan halaman harus masuk ke kedua bahasa. Gaya tulisnya: bahasa Indonesia semi-formal yang ramah, sapaan "kamu".

Struktur repo dan konvensi lengkap untuk kontributor (dan agen coding) ada di [`AGENTS.md`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/AGENTS.md).
