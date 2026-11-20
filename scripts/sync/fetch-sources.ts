import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAspiQris } from "./parse-aspi-qris.ts";

export type Kind = "pdf" | "xlsx" | "html";
/** `link` set: `url` is a page, and the file is the first href on it matching `link`. */
export type Source = { key: string; url: string; file: string; kind: Kind; link?: RegExp };
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
  { key: "bi-fast", url: `${BI}/List-Peserta-BI-FAST.pdf`, file: "bi-fast.pdf", kind: "pdf" },
  { key: "sknbi", url: `${BI}/List-Peserta-SKNBI.pdf`, file: "sknbi.pdf", kind: "pdf" },
  {
    key: "ojk-bank-umum",
    url: "https://ojk.go.id/id/kanal/perbankan/data-dan-statistik/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah.aspx",
    file: "ojk-bank-umum.xlsx",
    kind: "xlsx",
    // The Indonesian edition ("Daftar Alamat …"); the English one starts with "List of".
    link: /href="([^"]*Daftar[^"]*Bank[^"]*Umum[^"]*\.xlsx)"/i,
  },
  // HTML with per-request noise (nonces, asset hashes): the hash covers the parsed pairs, see fetchSources.
  {
    key: "aspi-qris",
    url: "https://aspi-indonesia.or.id/standar-dan-layanan/qris/",
    file: "aspi-qris.html",
    kind: "html",
  },
];

const USER_AGENT = "kode-bank-indonesia-sync/0.1";
const ROOT = new URL("../../", import.meta.url);

/** Throws unless the body is really a PDF (WAF/error pages come back as HTML with status 200). */
export function assertPdf(body: Uint8Array): void {
  const magic = new TextDecoder().decode(body.subarray(0, 5));
  if (magic !== "%PDF-") throw new Error(`expected a PDF, got ${JSON.stringify(magic)}…`);
}

/** Same for xlsx, which is a zip ("PK\x03\x04"). */
export function assertXlsx(body: Uint8Array): void {
  if (!(body[0] === 0x50 && body[1] === 0x4b && body[2] === 3 && body[3] === 4))
    throw new Error(
      `expected an xlsx, got ${JSON.stringify(new TextDecoder().decode(body.subarray(0, 5)))}…`,
    );
}

/** Finds the file link on a listing page; throws if the page layout changed. */
export function findLink(html: string, pageUrl: string, link: RegExp): string {
  const href = link.exec(html)?.[1];
  if (!href) throw new Error("file link not found on the page (layout changed or request blocked)");
  return new URL(href.replace(/&amp;/g, "&"), pageUrl).href.replace(/ /g, "%20");
}

export const sha256 = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");

export function compare(prev: Hashes, key: string, hash: string): FetchResult["status"] {
  if (!prev[key]) return "new";
  return prev[key].sha256 === hash ? "unchanged" : "changed";
}

// Note: bi.go.id hangs on HEAD requests, so always GET.
async function download(url: string, kind: Kind, attempts = 3): Promise<Uint8Array> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = new Uint8Array(await res.arrayBuffer());
      if (kind === "pdf") assertPdf(body);
      if (kind === "xlsx") assertXlsx(body);
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
    SOURCES.map(async ({ key, url, file, kind, link }): Promise<FetchResult> => {
      try {
        const fileUrl = link
          ? findLink(new TextDecoder().decode(await download(url, "html")), url, link)
          : url;
        const body = await download(fileUrl, kind);
        writeFileSync(new URL(file, rawDir), body);
        const hash = sha256(
          kind === "html"
            ? new TextEncoder().encode(JSON.stringify(parseAspiQris(new TextDecoder().decode(body))))
            : body,
        );
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
