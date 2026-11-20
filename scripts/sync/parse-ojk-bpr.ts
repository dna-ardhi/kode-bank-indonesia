import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readXlsx } from "../lib/xlsx.ts";

export type OjkBpr = { code: string; name: string };

/**
 * Parses OJK's BPR / BPRS head-office workbooks: header `NO | SANDI | NAMA BPR …`, then one numbered row
 * per bank with a 6-digit sandi. Throws on any other shape.
 */
export function parseOjkBpr(xlsx: Uint8Array): OjkBpr[] {
  const rows = readXlsx(xlsx);
  const head = rows[0] ?? [];
  if (!/^NO\.?$/.test(head[0] ?? "") || head[1] !== "SANDI" || head[2] !== "NAMA BPR")
    throw new Error(`unexpected OJK BPR header: ${JSON.stringify(head.slice(0, 3))}`);
  const out: OjkBpr[] = [];
  for (const [i, r] of rows.slice(1).entries()) {
    if (!r.some(Boolean)) continue;
    if (!/^\d+$/.test(r[0] ?? "") || !/^\d{6}$/.test(r[1] ?? "") || !r[2])
      throw new Error(`row ${i + 2}: unexpected row ${JSON.stringify(r.slice(0, 3))}`);
    out.push({ code: r[1], name: r[2] });
  }
  if (new Set(out.map((b) => b.code)).size !== out.length) throw new Error("duplicate OJK sandi");
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(
    JSON.stringify(parseOjkBpr(readFileSync(process.argv[2] ?? "sources/raw/ojk-bpr.xlsx")), null, 2),
  );
}
