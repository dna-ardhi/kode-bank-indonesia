import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readXlsx } from "../lib/xlsx.ts";

export type OjkBank = { code: string; name: string };

/** Loose key for comparing OJK names with BI-FAST names. Only used to report, never to assign codes. */
export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(pt|tbk|persero|indonesia|bank|the|limited|ltd|co)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");

/**
 * Parses OJK's "Daftar Alamat Kantor Pusat Bank Umum dan Syariah" workbook: header
 * `No. | Sandi Bank | Nama Bank …`, group-title rows ("BANK UMUM PERSERO"), numbered bank rows, and
 * trailing rename notes. Throws on any other shape.
 */
export function parseOjkBanks(xlsx: Uint8Array): OjkBank[] {
  const rows = readXlsx(xlsx);
  const head = rows[0] ?? [];
  if (head[0] !== "No." || head[1] !== "Sandi Bank" || head[2] !== "Nama Bank")
    throw new Error(`unexpected OJK header: ${JSON.stringify(head.slice(0, 3))}`);
  const out: OjkBank[] = [];
  for (const [i, r] of rows.slice(1).entries()) {
    if (/^\d+$/.test(r[0] ?? "")) {
      if (!/^\d{3}$/.test(r[1] ?? "") || !r[2])
        throw new Error(`row ${i + 2}: bad code/name ${JSON.stringify(r.slice(0, 3))}`);
      out.push({ code: r[1], name: r[2].replace(/\s+\d+\)$/, "") }); // "NAMA BANK 8)" = footnote marker
    } else if (r[1] || (r[0] && r[2])) {
      throw new Error(`row ${i + 2}: unexpected row ${JSON.stringify(r.slice(0, 3))}`);
    }
  }
  const codes = new Set(out.map((b) => b.code));
  if (codes.size !== out.length) throw new Error("duplicate OJK sandi bank");
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(
    JSON.stringify(parseOjkBanks(readFileSync(process.argv[2] ?? "sources/raw/ojk-bank-umum.xlsx")), null, 2),
  );
}
