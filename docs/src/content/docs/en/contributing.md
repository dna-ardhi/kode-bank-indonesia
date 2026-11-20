---
title: Contributing
description: How to run the project locally, the rules for changing data, and commit conventions.
---

Corrections are very welcome, especially **bank codes with evidence**, **account number formats**, and **e-wallet operator names checked** against Bank Indonesia's licence register.

## Run it locally

```sh
git clone https://github.com/dna-ardhi/kode-bank-indonesia.git
cd kode-bank-indonesia
pnpm install
pnpm validate && pnpm lint && pnpm typecheck && pnpm test
```

You need **Node ≥ 22.18** (see `.nvmrc`) and [pnpm](https://pnpm.io/installation). The pnpm version is pinned in `package.json`. To run this documentation site you need **Node ≥ 22.23.4**.

## Rules for data changes

- Edit `data/banks.json` or `data/ewallets.json`, and keep `pnpm validate` passing.
- **Never guess.** A bank code, BIC or account format you can't back up stays `null` (or omitted), and the record stays `verified: false`. For a new or changed `bank_code`, add the evidence to `sources/bank-codes.json` and link the sources in your PR.
- **Never rename, reuse or delete an `id`.** To retire a record, set `status: "inactive"` and `merged_into`.
- Keep `name` **exactly** as the BI-FAST list writes it, so the sync can match it.
- Use [Conventional Commits](https://www.conventionalcommits.org/), e.g. `fix(data): correct bank code for bank-x`.

## Commands

| Command | What it does |
|---|---|
| `pnpm validate` | Schema and cross-record checks on `data/` |
| `pnpm test` | Builds `dist/`, then runs the test suite |
| `pnpm build` | Writes the static API to `dist/` |
| `pnpm sync:fetch` | Downloads the official PDFs and reports hash changes |
| `pnpm sync:diff` | Compares the downloaded PDFs with `data/` |
| `pnpm docs:dev` | Runs this documentation site locally |
| `pnpm docs:build` | Builds this documentation site to `docs/dist/` |

## Writing documentation

The docs live in `docs/src/content/docs/`. Indonesian pages are at the root (the default language), and the English versions are under `en/` with the **exact same paths**. Every page change must land in both languages. The writing style is friendly, semi-formal Bahasa Indonesia, addressing the reader as "kamu".

Repository layout and full conventions for contributors (and coding agents) are in [`AGENTS.md`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/AGENTS.md).
