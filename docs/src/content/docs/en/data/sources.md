---
title: Data sources
description: Where names, BICs and bank codes come from, including the limits of each source.
---

| Source | Used for |
|---|---|
| [BI-FAST participant list](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-BI-FAST.pdf) (Bank Indonesia, PDF) | Names, BICs, `bi_fast` |
| [SKNBI participant list](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-SKNBI.pdf) (Bank Indonesia, PDF) | `sknbi` membership, by BIC only |
| [BI licensed payment providers](https://www.bi.go.id/id/layanan/informasi-perizinan/sistem-pembayaran/default.aspx) | E-wallet operators (checked by hand) |
| [OJK head-office list, Bank Umum dan Syariah](https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah.aspx) (xlsx) | `bank_code` ("Sandi Bank") |
| [ASPI QRIS directory](https://aspi-indonesia.or.id/standar-dan-layanan/qris/) | Operator ↔ app name links, as review evidence for aliases and new e-wallets (no BICs or codes) |
| Published bank code lists | `bank_code` where OJK has no entry, and a cross-check |

## Why SKNBI is used for BICs only

The current SKNBI PDF edition (as of 24 September 2026) has a name column that **doesn't line up** with its BIC column: the names are the BI-FAST list pasted in order. So we only use its list of member BICs, not its names. A test in the repo pins this, and will fail if BI fixes the PDF, as a reminder to re-check.

## About bank codes

`bank_code` is decided like this:

1. The **OJK** head-office list (Bank Umum dan Syariah) gives the 3-digit "Sandi Bank". It is the primary source.
2. For records OJK doesn't list (sharia units, brands), we use the code **most** of eight published lists report (Indonesian financial news sites and a payment provider's docs), with at least **two** agreeing and no tie.
3. If OJK and a news majority disagree, the code is **not** confirmed and the sync report flags it for a human.
4. Records linked to a code list only through a former name or a BIC prefix stay `verified: false`.

Every vote, with the source URLs and the matched lines, is recorded in [`sources/bank-codes.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/bank-codes.json). Many of those news lists copy each other, so treat agreement as **evidence**, not **proof**.

## Deliberately left out

Some participants (Bank Indonesia itself, KSEI, and others) aren't relevant to a bank picker. They're listed with reasons in [`sources/ignored-bics.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/ignored-bics.json).

## Two source quirks

- **BI's payment provider register** starts resetting connections after a few scripted requests, so we don't automate it.
- **OJK** has rejected non-browser clients before. A plain request with our honest user agent works today. If it stops working, the sync fails loudly and we don't try to get around the block.
