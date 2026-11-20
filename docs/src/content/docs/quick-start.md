---
title: Mulai cepat
description: Pakai daftar bank Indonesia di proyekmu dalam dua menit, lewat fetch atau paket npm.
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

## Cara 2: paket npm

```sh
npm install kode-bank-indonesia
```

```ts
import { all, banks, ewallets, findById, search, type Institution } from "kode-bank-indonesia";

findById("bca")?.bank_code; // "014"
search("mandiri"); // exact match dulu, lalu prefix, lalu substring
search("014"); // kode bank atau BIC, harus persis sama
const pilihan = search(query).filter((r) => r.status === "active");
```

Data ikut terpaket, jadi aplikasimu jalan tanpa koneksi ke mana-mana. Detail ekspor ada di [referensi paket npm](../reference/npm/).

## Cara 3: fetch dengan fallback (disarankan untuk produksi)

Coba GitHub Pages dulu, lalu jsDelivr, dan kalau dua-duanya gagal, pakai data bawaan paket:

```js
import { all as bundled } from "kode-bank-indonesia";

const URLS = [
  "https://dna-ardhi.github.io/kode-bank-indonesia/v1/all.json",
  "https://cdn.jsdelivr.net/npm/kode-bank-indonesia@1/dist/v1/all.json",
];

export async function loadInstitutions() {
  for (const url of URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return (await res.json()).data;
    } catch {
      // coba mirror berikutnya
    }
  }
  return bundled;
}
```

Nggak pakai paket npm? Hapus `import` dan baris `return bundled`, lalu tangani error-nya sendiri.

## Langkah berikutnya

- Coba langsung di [contoh form](../form-example/) yang interaktif.
- Pahami arti tiap field di [struktur data](../reference/schema/).
- Baca dulu [flag `verified`](../reference/verified/) sebelum menampilkan kode bank ke user.
