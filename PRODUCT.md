# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Indonesian web and app developers building "pick a bank or e-wallet, enter account number + holder name" forms (payouts, checkout, KYC). They read the docs at integration time, copy a snippet, and leave. Many read Bahasa Indonesia first; English is parallel.

## Product Purpose

A free static JSON API listing every Indonesian bank and e-wallet with 3-digit bank codes (sandi bank) and BICs, plus a documentation site (`docs/`, Astro Starlight) that explains the API and lets developers browse the data and try a form demo. Success: a developer finds the right record, trusts how much to rely on it, and ships the form.

## Positioning

No server, no key, no signup: fetch a JSON file from GitHub Pages. (Confirmed by the user as the claim a neighbouring list could not truthfully copy.)

## Operating Context

- Data is hand-reviewed; official sources (BI-FAST and SKNBI participant PDFs) are synced on a schedule and changes arrive as PRs.
- Deployed to GitHub Pages under the `/kode-bank-indonesia` base path, together with the `/v1` API.
- Docs live in `docs/src/content/docs/`; Bahasa Indonesia at the root, English under `en/` with identical relative paths.

## Capabilities and Constraints

- Endpoints: `/v1/all.json`, `banks.json`, `ewallets.json`, `by-id/{id}.json`, `meta.json`. `/v1` paths, fields and ids are stable; breaking changes go to `/v2`.
- Not included: verifying that an account number belongs to a holder name (needs a paid inquiry API).
- `verified: true` is a narrow, documented guarantee; many records (brands, sharia units, most e-wallets) are deliberately `verified: false`. Unknown values are `null`, never guessed.
- Static only; relative links in docs; no docs page may use the slug `v1`.
- Counts shown in the docs come from `docs/src/stats.ts`, never typed by hand.
- Terminology: sandi bank, BIC, BI-FAST, SKNBI, UUS (sharia unit), BPD (regional bank).

## Brand Commitments

- Bilingual: Bahasa Indonesia default, tone friendly and semi-formal ("kamu"), technical terms stay in English; English pages are parallel text, not literal translations.
- No fabricated data or claims: no invented codes, logos, customers, benchmarks or testimonials. The `logo` field is reserved and always `null`.

## Evidence on Hand

Real data in `data/banks.json` and `data/ewallets.json`; code evidence in `sources/bank-codes.json`; official fixtures in `tests/fixtures/`. No testimonials, customer logos, usage numbers or benchmarks exist; future work must not fabricate them.

## Product Principles

1. Honesty about confidence: show what is verified and what is not, and never imply certainty the data lacks.
2. Zero-setup first: the fastest path from landing to a working `fetch` call is the primary job.
3. Stable contract: nothing in the docs suggests paths, fields or ids can shift under integrators.
4. Both languages are first-class; every change lands in Indonesian and English.

## Accessibility & Inclusion

WCAG 2.1 AA is the required standard: contrast, keyboard operation, visible focus, and reduced-motion support, in both the dark and light themes.
