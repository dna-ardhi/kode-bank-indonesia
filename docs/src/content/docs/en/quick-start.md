---
title: Quick start
description: Use the Indonesian bank list in your project in two minutes, with a plain fetch.
---

There are two ways to use it. Pick whichever fits your project.

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

## Option 2: fetch with a fallback (recommended for production)

Fetch the live API, and keep your own copy of `all.json` in your app for when the request fails:

```js
import fallback from "./all.json"; // a copy you saved from /v1/all.json

export async function loadInstitutions() {
  try {
    const res = await fetch("https://dna-ardhi.github.io/kode-bank-indonesia/v1/all.json", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return (await res.json()).data;
  } catch {
    // network error or timeout: use the saved copy
  }
  return fallback.data;
}
```

Refresh the saved copy now and then. `/v1/meta.json` has `generated_at` if you want to check how old it is.

## What's next

- Try it live in the interactive [form example](../form-example/).
- Learn what every field means in the [data schema](../reference/schema/).
- Read the [`verified` flag](../reference/verified/) before showing bank codes to users.
