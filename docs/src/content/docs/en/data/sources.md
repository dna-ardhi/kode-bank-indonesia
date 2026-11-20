---
title: Data sources
description: Where names, BICs and bank codes come from, including the limits of each source.
---

| Source | Used for |
|---|---|
| [BI-FAST participant list](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-BI-FAST.pdf) (Bank Indonesia, PDF) | Names, BICs, `bi_fast` |
| [SKNBI participant list](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents/List-Peserta-SKNBI.pdf) (Bank Indonesia, PDF) | `sknbi` membership, by BIC only |
| [BI licensed payment providers](https://www.bi.go.id/id/layanan/informasi-perizinan/sistem-pembayaran/default.aspx) | E-wallet operators (checked by hand) |
| [OJK banking directory](https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/direktori-perbankan-indonesia) | Reference (checked by hand) |
| Published bank code lists | `bank_code` |

## Why SKNBI is used for BICs only

The current SKNBI PDF edition (as of 24 September 2026) has a name column that **doesn't line up** with its BIC column: the names are the BI-FAST list pasted in order. So we only use its list of member BICs, not its names. A test in the repo pins this, and will fail if BI fixes the PDF, as a reminder to re-check.

## About bank codes

There is no official, machine-readable dataset of 3-digit bank codes (sandi bank). So `bank_code` is decided like this:

1. We collect the code from eight published lists: Indonesian financial news sites and a payment provider's docs.
2. The chosen code is the one **most** publishers report, with at least **two** agreeing and no tie.
3. A code counts as **confirmed** only if no rival code has two or more publishers.
4. Records whose code was reached through a former name or a BIC prefix stay `verified: false`.

Every vote, with the source URLs and the matched lines, is recorded in [`sources/bank-codes.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/bank-codes.json). Many of those news lists copy each other, so treat agreement as **evidence**, not **proof**.

## Deliberately left out

Some participants (Bank Indonesia itself, KSEI, and others) aren't relevant to a bank picker. They're listed with reasons in [`sources/ignored-bics.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/ignored-bics.json).

## Two sources that are checked by hand

- **BI's payment provider register** starts resetting connections after a few scripted requests, so we don't automate it.
- **OJK** uses a firewall that rejects non-browser clients. We don't try to get around it.
