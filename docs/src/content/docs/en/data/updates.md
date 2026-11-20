---
title: How data stays current
description: The weekly sync with Bank Indonesia's official lists, and what is still done by hand.
---

The data is kept up to date with a mix of automation and human review.

## The weekly flow

1. **Every Monday at 02:00 UTC**, the [sync workflow](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/.github/workflows/sync.yml) downloads the BI-FAST and SKNBI PDFs and compares their SHA-256 hashes with [`sources/hashes.json`](https://github.com/dna-ardhi/kode-bank-indonesia/blob/main/sources/hashes.json).
2. **If a file changed**, it parses it and compares it with `data/`. It opens a pull request with the proposed changes and a report of added, removed and renamed participants.
3. **A maintainer reviews the PR**, fills in what can't be automated (category, display name, bank code evidence), and merges it.
4. **Merging to `main`** redeploys GitHub Pages.

## Safety rules

- Every record the sync touches is set to `verified: false`.
- The sync **never deletes or deactivates** a record. Leaving BI-FAST isn't proof of a closure, so a human decides on `status` and `merged_into`.
- New participants arrive as stub records with a placeholder category and no bank code, for the reviewer to complete.

## When the sync fails

For example, because Bank Indonesia changed the PDF layout. The parsers are deliberately strict and fail loudly instead of guessing. The workflow then opens an **issue labelled `sync-failure`**, not a PR. For a layout change: add the new PDF to `tests/fixtures/`, then update the parser and its row-count tests.

## Still manual

- Checking e-wallet operators against BI's payment provider register.
- The OJK directory reference.
- Collecting bank code evidence.
- Account number formats (none confirmed yet).
