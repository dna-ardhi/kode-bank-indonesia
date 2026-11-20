---
title: Cara data diperbarui
description: Sinkronisasi mingguan dengan daftar resmi Bank Indonesia, dan apa yang tetap dikerjakan manual.
---

Datanya dijaga dengan kombinasi otomatisasi dan review manusia.

## Alur mingguan

1. **Setiap Senin pukul 02:00 UTC**, [workflow sync](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/.github/workflows/sync.yml) mengunduh PDF BI-FAST dan SKNBI, lalu membandingkan hash SHA-256-nya dengan [`sources/hashes.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/hashes.json).
2. **Kalau ada file yang berubah**, workflow mem-parse-nya dan membandingkan dengan `data/`. Hasilnya berupa pull request berisi usulan perubahan dan laporan peserta yang ditambahkan, dihapus, atau berganti nama.
3. **Maintainer me-review PR itu**, mengisi hal yang nggak bisa diotomatisasi (kategori, nama tampilan, bukti kode bank), lalu merge.
4. **Merge ke `main`** memicu deploy ulang GitHub Pages.

## Aturan keselamatan

- Setiap record yang disentuh sinkronisasi otomatis menjadi `verified: false`.
- Sinkronisasi **nggak pernah menghapus atau menonaktifkan** record. Keluar dari BI-FAST belum tentu berarti bank tutup, jadi manusia yang memutuskan `status` dan `merged_into`.
- Peserta baru muncul sebagai record kerangka dengan kategori sementara dan tanpa kode bank, yang harus dilengkapi reviewer.

## Kalau sinkronisasi gagal

Misalnya karena Bank Indonesia mengubah tata letak PDF. Parser sengaja dibuat ketat dan akan gagal dengan jelas, bukan menebak. Workflow lalu membuka **issue berlabel `sync-failure`**, bukan PR. Untuk perubahan tata letak: tambahkan PDF baru ke `tests/fixtures/`, perbarui parser dan tes jumlah barisnya.

## Yang tetap manual

- Cek operator e-wallet ke register penyelenggara jasa pembayaran BI.
- Referensi ke direktori OJK.
- Pengumpulan bukti kode bank.
- Format nomor rekening (belum ada yang terkonfirmasi).
