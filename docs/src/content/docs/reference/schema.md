---
title: Struktur data
description: Bentuk satu record institusi, arti tiap field, dan daftar kategori.
---

Bank dan e-wallet memakai bentuk record yang sama. Contohnya BCA:

```json
{
  "id": "bca",
  "type": "bank",
  "category": "commercial",
  "name": "PT. BANK CENTRAL ASIA Tbk.",
  "display_name": "BCA",
  "aliases": ["Bank Central Asia"],
  "parent_id": null,
  "bank_code": "014",
  "bic": "CENAIDJA",
  "bi_fast": true,
  "sknbi": true,
  "account_number": { "kind": "account", "label": "Nomor rekening" },
  "logo": null,
  "status": "active",
  "merged_into": null,
  "sources": ["bi-fast", "sknbi"],
  "verified": true,
  "updated_at": "2026-11-20"
}
```

## Field

| Field | Arti |
|---|---|
| `id` | Slug kebab-case yang stabil. Nggak akan diganti atau dipakai ulang. |
| `type` | `bank` atau `ewallet` |
| `category` | Lihat tabel kategori di bawah |
| `name` | Nama hukum persis seperti tertulis di daftar BI-FAST Bank Indonesia. Untuk e-wallet: nama hukum operatornya. |
| `display_name`, `aliases` | Nama yang ditampilkan ke user, dan nama lain yang ikut dicocokkan saat pencarian |
| `parent_id` | Untuk brand (Jenius, TMRW, digibank, LINE Bank) dan unit usaha syariah: bank induknya |
| `bank_code` | Sandi bank 3 digit sebagai string, nol di depan dipertahankan. `null` kalau belum ada kode yang bisa dikonfirmasi; e-wallet memang nggak punya kode. Brand memakai kode induknya. |
| `bic` | Kode BIC/SWIFT dari daftar BI-FAST. `null` untuk brand dan sebagian e-wallet. |
| `sknbi_bic` | Hanya ada kalau daftar SKNBI memakai BIC yang berbeda dari `bic` |
| `ojk_code` | Hanya ada di BPR/BPRS: sandi OJK 6 digit. Bukan kode transfer; `bank_code` tetap `null` untuk ini. |
| `bi_fast`, `sknbi` | Apakah institusi itu peserta BI-FAST / SKNBI (brand mengikuti induknya) |
| `account_number` | `kind` (`account` atau `phone`) dan `label` untuk form. `min_length`, `max_length`, dan `pattern` baru muncul kalau sudah terkonfirmasi; sekarang belum ada yang terisi. |
| `logo` | Dicadangkan; saat ini selalu `null` |
| `status`, `merged_into` | `active` atau `inactive`. Institusi yang merger atau ganti nama tetap ada di daftar sebagai `inactive`, dan `merged_into` menunjuk ke penerusnya. |
| `sources` | Daftar sumber mana yang memuat record ini: `bi-fast`, `sknbi`, `ojk` (untuk `bank_code`-nya), `aspi-qris` (direktori QRIS ASPI menyebut operatornya), `bi-pjp` (izinnya dicek manual di register Bank Indonesia) |
| `verified` | Lihat [flag verified](../verified/) |
| `updated_at` | Tanggal terakhir record berubah (YYYY-MM-DD) |

## Kategori

| `category` | Untuk |
|---|---|
| `commercial` | Bank umum |
| `sharia` | Bank umum syariah |
| `sharia-unit` | Unit usaha syariah (UUS) milik bank konvensional |
| `regional` | Bank pembangunan daerah (BPD) |
| `foreign` | Kantor cabang bank asing |
| `digital` | Bank digital |
| `bpr`, `bprs` | Bank perekonomian rakyat (BPR) dan BPR syariah (BPRS), hanya di `/v1/bprs.json` |
| `ewallet` | E-wallet (khusus `type: "ewallet"`) |

Definisi lengkapnya ada di [`schema/institution.schema.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/schema/institution.schema.json) (JSON Schema 2020-12).

## Brand dan unit usaha syariah

- **Brand** (misalnya Jenius) adalah record sendiri dengan `parent_id`, `bic: null`, dan `bank_code` milik induknya. Mereka selalu `verified: false`, karena nggak ada daftar resmi yang menamai brand.
- **Unit usaha syariah** punya BIC sendiri dan `parent_id`, tapi **nggak** mewarisi kode induknya. Kode mereka hanya diisi kalau ada buktinya.
