---
title: Sumber data
description: Dari mana nama, BIC, dan kode bank berasal, termasuk batasan tiap sumber.
---

| Sumber | Dipakai untuk |
|---|---|
| [Daftar peserta BI-FAST](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-BI-FAST.pdf) (Bank Indonesia, PDF) | Nama, BIC, `bi_fast` |
| [Daftar peserta SKNBI](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-SKNBI.pdf) (Bank Indonesia, PDF) | Keanggotaan `sknbi`, hanya berdasarkan BIC |
| [Penyelenggara jasa pembayaran berizin BI](https://www.bi.go.id/id/layanan/informasi-perizinan/sistem-pembayaran/default.aspx) | Izin operator e-wallet (`bi-pjp`, dicek manual; lihat `sources/ewallet-licences.json`) |
| [Daftar kantor pusat Bank Umum dan Syariah OJK](https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah.aspx) (xlsx) | `bank_code` ("Sandi Bank"); nama lama dari catatan kakinya, sebagai alias |
| [Daftar kantor pusat BPR dan BPRS OJK](https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/Pages/Daftar-Alamat-Kantor-Pusat-BPR.aspx) (xlsx) | `/v1/bprs.json`: nama dan `ojk_code` |
| [Direktori QRIS ASPI](https://aspi-indonesia.or.id/standar-dan-layanan/qris/) | Hubungan operator ↔ nama aplikasi, sebagai bukti review untuk alias dan e-wallet baru (tanpa BIC atau kode) |
| Daftar kode bank terbitan situs berita keuangan Indonesia | `bank_code` kalau OJK nggak punya entrinya, dan sebagai pembanding |

## Kenapa SKNBI hanya dipakai untuk BIC

Edisi PDF SKNBI saat ini (per 24 September 2026) punya kolom nama yang **nggak sejajar** dengan kolom BIC-nya: namanya seperti daftar BI-FAST yang ditempel urut. Jadi kami hanya memakai daftar BIC anggotanya, bukan namanya. Ada tes di repo yang mengunci kondisi ini, dan akan gagal kalau BI memperbaiki PDF-nya, sebagai pengingat untuk mengecek ulang.

## Soal kode bank

`bank_code` ditentukan begini:

1. Daftar kantor pusat Bank Umum dan Syariah dari **OJK** memuat "Sandi Bank" 3 digit. Ini sumber utama.
2. Untuk record yang nggak ada di daftar OJK (unit usaha syariah, brand), kami pakai kode yang dilaporkan **paling banyak** dari tujuh daftar terbitan situs berita keuangan Indonesia, minimal **dua** yang sepakat, tanpa seri, dan nggak ada kode lain yang dilaporkan dua daftar atau lebih.
3. Kalau OJK dan mayoritas berita berbeda, kodenya **nggak** dianggap terkonfirmasi dan laporan sync menandainya untuk dicek manusia.
4. Record yang kodenya tersambung ke daftar kode hanya lewat nama lama atau awalan BIC tetap `verified: false`.
5. Kalau OJK mengganti nama bank di balik kode yang kami pakai, atau menghapus kodenya, laporan sync juga menandainya untuk dicek manusia.

Setiap suara, lengkap dengan URL sumber dan baris yang cocok, tercatat di [`sources/bank-codes.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/bank-codes.json). Banyak daftar berita itu saling menyalin, jadi anggap kesepakatan sebagai **bukti**, bukan **bukti mutlak**.

Dokumentasi payout Rapyd dulu ikut dihitung, sekarang nggak lagi: untuk 10 bank yang ada di daftar OJK, kodenya berbeda dengan Sandi Bank OJK (misalnya BCA 624, padahal 014). Sumber yang bertentangan dengan OJK nggak kami anggap bukti.

## Yang sengaja nggak dimasukkan

Beberapa peserta (Bank Indonesia sendiri, KSEI, dan lainnya) bukan bank yang relevan untuk form pilih bank. Daftar beserta alasannya ada di [`sources/ignored-bics.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/ignored-bics.json).

## Dua catatan soal sumber

- **Register penyelenggara jasa pembayaran BI** menolak koneksi setelah beberapa request otomatis, jadi nggak kami otomatisasi.
- **OJK** pernah menolak klien non-browser. Saat ini request biasa dengan user agent kami yang jujur berhasil. Kalau nanti berhenti, sync gagal dengan jelas dan kami nggak mencoba menembus blokirnya.
