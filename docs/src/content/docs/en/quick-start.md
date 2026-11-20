---
title: Quick start
description: Use the Indonesian bank list in your project in two minutes, with fetch or the npm package.
---

There are two ways to use it. Pick whichever fits your project, or combine them.

## Option 1: plain fetch

No install needed:

```js
const res = await fetch("https://dna-ardhi.github.io/kode-bank-indonesia/v1/all.json");
const { data } = await res.json();

const bca = data.find((r) => r.id === "bca");
console.log(bca.bank_code); // "014"
```

Only need one bank? Fetch it by `id`:

```js
const bca = await fetch("https://dna-ardhi.github.io/kode-bank-indonesia/v1/by-id/bca.json").then((r) => r.json());
```

## Option 2: the npm package

```sh
npm install kode-bank-indonesia
```

```ts
import { all, banks, ewallets, findById, search, type Institution } from "kode-bank-indonesia";

findById("bca")?.bank_code; // "014"
search("mandiri"); // exact matches first, then prefix, then substring
search("014"); // bank code or BIC, exact
const choices = search(query).filter((r) => r.status === "active");
```

The data ships inside the package, so your app works without reaching any server. Export details are in the [npm package reference](../reference/npm/).

## Option 3: fetch with fallbacks (recommended for production)

Try GitHub Pages first, then jsDelivr, and if both fail, use the data bundled in the package:

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
      // try the next mirror
    }
  }
  return bundled;
}
```

Not using the npm package? Drop the `import` and the `return bundled` line, and handle the error yourself.

## What's next

- Try it live in the interactive [form example](../form-example/).
- Learn what every field means in the [data schema](../reference/schema/).
- Read the [`verified` flag](../reference/verified/) before showing bank codes to users.
