---
title: Sumber data
description: Dari mana nama, BIC, dan kode bank berasal, termasuk batasan tiap sumber.
---

| Sumber | Dipakai untuk |
|---|---|
| [Daftar peserta BI-FAST](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-BI-FAST.pdf) (Bank Indonesia, PDF) | Nama, BIC, `bi_fast` |
| [Daftar peserta SKNBI](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-SKNBI.pdf) (Bank Indonesia, PDF) | Keanggotaan `sknbi`, hanya berdasarkan BIC |
| [Penyelenggara jasa pembayaran berizin BI](https://www.bi.go.id/id/layanan/informasi-perizinan/sistem-pembayaran/default.aspx) | Operator e-wallet (dicek manual) |
| [Direktori perbankan OJK](https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/direktori-perbankan-indonesia) | Referensi (dicek manual) |
| Daftar kode bank yang diterbitkan pihak lain | `bank_code` |

## Kenapa SKNBI hanya dipakai untuk BIC

Edisi PDF SKNBI saat ini (per 24 September 2026) punya kolom nama yang **nggak sejajar** dengan kolom BIC-nya: namanya seperti daftar BI-FAST yang ditempel urut. Jadi kami hanya memakai daftar BIC anggotanya, bukan namanya. Ada tes di repo yang mengunci kondisi ini, dan akan gagal kalau BI memperbaiki PDF-nya, sebagai pengingat untuk mengecek ulang.

## Soal kode bank

Nggak ada dataset resmi yang memuat kode bank 3 digit (sandi bank) dalam format yang bisa dibaca mesin. Jadi `bank_code` ditentukan begini:

1. Kami mengumpulkan kode dari delapan daftar terbitan situs berita keuangan Indonesia dan dokumentasi penyedia pembayaran.
2. Kode yang dipilih adalah yang dilaporkan **paling banyak** penerbit, minimal **dua** yang sepakat, tanpa seri.
3. Kode dianggap **terkonfirmasi** hanya kalau nggak ada kode saingan yang didukung dua penerbit atau lebih.
4. Record yang kodenya tersambung lewat nama lama atau awalan BIC tetap `verified: false`.

Setiap suara, lengkap dengan URL sumber dan baris yang cocok, tercatat di [`sources/bank-codes.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/bank-codes.json). Banyak daftar berita itu saling menyalin, jadi anggap kesepakatan sebagai **bukti**, bukan **bukti mutlak**.

## Yang sengaja nggak dimasukkan

Beberapa peserta (Bank Indonesia sendiri, KSEI, dan lainnya) bukan bank yang relevan untuk form pilih bank. Daftar beserta alasannya ada di [`sources/ignored-bics.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/ignored-bics.json).

## Dua sumber yang dicek manual

- **Register penyelenggara jasa pembayaran BI** menolak koneksi setelah beberapa request otomatis, jadi nggak kami otomatisasi.
- **OJK** memakai firewall yang menolak klien non-browser. Kami nggak mencoba menembusnya.
