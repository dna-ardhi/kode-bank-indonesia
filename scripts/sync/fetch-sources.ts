import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Source = { key: string; url: string; file: string };
export type Hashes = Record<string, { sha256: string; updated_at: string }>;
export type FetchResult = {
  key: string;
  status: "new" | "changed" | "unchanged" | "failed";
  sha256?: string;
  error?: string;
};

const BI = "https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/infrastruktur/Documents";

/**
 * Sources fetched automatically. OJK and the BI PJP licence list are reference sources checked by hand:
 * OJK's site rejects non-browser clients and we don't work around that.
 */
export const SOURCES: Source[] = [
  { key: "bi-fast", url: `${BI}/List-Peserta-BI-FAST.pdf`, file: "bi-fast.pdf" },
  { key: "sknbi", url: `${BI}/List-Peserta-SKNBI.pdf`, file: "sknbi.pdf" },
];

const USER_AGENT = "kode-bank-indonesia-sync/0.1";
const ROOT = new URL("../../", import.meta.url);

/** Throws unless the body is really a PDF (WAF/error pages come back as HTML with status 200). */
export function assertPdf(body: Uint8Array): void {
  const magic = new TextDecoder().decode(body.subarray(0, 5));
  if (magic !== "%PDF-") throw new Error(`expected a PDF, got ${JSON.stringify(magic)}…`);
}

export const sha256 = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");

export function compare(prev: Hashes, key: string, hash: string): FetchResult["status"] {
  if (!prev[key]) return "new";
  return prev[key].sha256 === hash ? "unchanged" : "changed";
}

// Note: bi.go.id hangs on HEAD requests, so always GET.
async function download(url: string, attempts = 3): Promise<Uint8Array> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = new Uint8Array(await res.arrayBuffer());
      assertPdf(body);
      return body;
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 5_000 * i));
    }
  }
}

/** Downloads every source into sources/raw/ and reports which changed. `write` updates sources/hashes.json. */
export async function fetchSources({ write = false } = {}): Promise<FetchResult[]> {
  const hashesUrl = new URL("sources/hashes.json", ROOT);
  const prev: Hashes = JSON.parse(readFileSync(hashesUrl, "utf8"));
  const next: Hashes = { ...prev };
  const rawDir = new URL("sources/raw/", ROOT);
  mkdirSync(rawDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  const results = await Promise.all(
    SOURCES.map(async ({ key, url, file }): Promise<FetchResult> => {
      try {
        const body = await download(url);
        writeFileSync(new URL(file, rawDir), body);
        const hash = sha256(body);
        const status = compare(prev, key, hash);
        if (status !== "unchanged") next[key] = { sha256: hash, updated_at: today };
        return { key, status, sha256: hash };
      } catch (err) {
        return { key, status: "failed", error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );

  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  if (write) writeFileSync(hashesUrl, `${JSON.stringify(sorted, null, 2)}\n`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = await fetchSources({ write: process.argv.includes("--write") });
  console.log(JSON.stringify(results, null, 2));
  if (results.some((r) => r.status === "failed")) process.exit(1);
}
