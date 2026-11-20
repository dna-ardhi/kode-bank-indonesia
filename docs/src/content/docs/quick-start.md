---
title: Mulai cepat
description: Pakai daftar bank Indonesia di proyekmu dalam dua menit, lewat fetch biasa.
---

Ada dua cara pakai. Pilih yang cocok sama proyekmu, atau gabungkan keduanya.

## Cara 1: fetch langsung

Tanpa instalasi apa pun:

```js
const res = await fetch("https://dna-ardhi.github.io/kode-bank-indonesia/v1/all.json");
const { data } = await res.json();

const bca = data.find((r) => r.id === "bca");
console.log(bca.bank_code); // "014"
```

Cuma butuh satu bank? Ambil per `id`:

```js
const bca = await fetch("https://dna-ardhi.github.io/kode-bank-indonesia/v1/by-id/bca.json").then((r) => r.json());
```

## Cara 2: fetch dengan fallback (disarankan untuk produksi)

Ambil API langsung, dan simpan salinan `all.json` di aplikasimu untuk jaga-jaga kalau request gagal:

```js
import fallback from "./all.json"; // salinan yang kamu simpan dari /v1/all.json

export async function loadInstitutions() {
  try {
    const res = await fetch("https://dna-ardhi.github.io/kode-bank-indonesia/v1/all.json", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return (await res.json()).data;
  } catch {
    // error jaringan atau timeout: pakai salinan yang disimpan
  }
  return fallback.data;
}
```

Perbarui salinan itu sesekali. `/v1/meta.json` punya `generated_at` kalau kamu mau cek seberapa lama.

## Langkah berikutnya

- Coba langsung di [contoh form](../form-example/) yang interaktif.
- Pahami arti tiap field di [struktur data](../reference/schema/).
- Baca dulu [flag `verified`](../reference/verified/) sebelum menampilkan kode bank ke user.
