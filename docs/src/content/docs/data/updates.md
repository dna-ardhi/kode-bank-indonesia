---
title: Cara data diperbarui
description: Sinkronisasi mingguan dengan daftar resmi Bank Indonesia, dan apa yang tetap dikerjakan manual.
---

Datanya dijaga dengan kombinasi otomatisasi dan review manusia.

## Alur mingguan

1. **Setiap Senin pukul 02:00 UTC**, [workflow sync](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/.github/workflows/sync.yml) mengunduh PDF BI-FAST dan SKNBI, daftar bank OJK, dan halaman QRIS ASPI, lalu membandingkan hash SHA-256-nya dengan [`sources/hashes.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/hashes.json).
2. **Kalau ada sumber yang berubah**, workflow mem-parse-nya dan membandingkan dengan `data/`. Hasilnya pull request berisi usulan perubahan dan laporan, plus kenaikan versi patch kalau `data/` berubah.
3. **Perubahan berisiko rendah di-merge otomatis.** Sinkronisasi menerapkan sendiri dua jenis perubahan: kode bank OJK untuk bank yang belum punya kode, dan nama aplikasi ASPI sebagai alias (beserta sumber `aspi-qris`). Kalau satu putaran hanya berisi itu (atau cuma perubahan hash), PR di-merge otomatis setelah CI lolos.
4. **Sisanya menunggu maintainer**: peserta baru, dihapus, atau berganti nama, kode OJK yang berbeda dengan punya kami, bank OJK yang belum ada di data, kode yang kami pakai tapi diganti namanya atau dihapus oleh OJK, dan record yang nggak lagi ada di direktori QRIS ASPI. Maintainer mengisi hal yang nggak bisa diotomatisasi (kategori, nama tampilan, bukti kode bank), lalu merge.
5. **Merge ke `main`** memicu deploy ulang GitHub Pages.

## Aturan keselamatan

- Setiap record yang disentuh sinkronisasi otomatis menjadi `verified: false`.
- Sinkronisasi **nggak pernah menghapus atau menonaktifkan** record. Keluar dari BI-FAST belum tentu berarti bank tutup, jadi manusia yang memutuskan `status` dan `merged_into`.
- Peserta baru muncul sebagai record kerangka dengan kategori sementara dan tanpa kode bank, yang harus dilengkapi reviewer.

## Kalau sinkronisasi gagal

Misalnya karena Bank Indonesia mengubah tata letak PDF. Parser sengaja dibuat ketat dan akan gagal dengan jelas, bukan menebak. Workflow lalu membuka **issue berlabel `sync-failure`**, bukan PR. Untuk perubahan tata letak: tambahkan PDF baru ke `tests/fixtures/`, perbarui parser dan tes jumlah barisnya.

## Yang tetap manual

- Cek operator e-wallet ke register penyelenggara jasa pembayaran BI.
- Pengumpulan bukti kode bank untuk bank yang nggak ada di daftar OJK.
- Format nomor rekening (belum ada yang terkonfirmasi).
