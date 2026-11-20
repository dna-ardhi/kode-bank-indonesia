import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseParticipantPdf, type ServiceColumn } from "../lib/pdf-table.ts";

export const SKNBI_COLUMNS: ServiceColumn[] = [
  { key: "transfer-dana", header: "Transfer Dana" },
  { key: "pembayaran-reguler", header: "Pembayaran" },
  { key: "kliring-warkat-debit", header: "Layanan Kliring" },
  { key: "penagihan-reguler", header: "Penagihan" },
];

/**
 * Known source defect (edition "Per 24 Sept 2026"): the Nama column (and with it the ✓ columns)
 * is the BI-FAST name list pasted in order, so names do NOT match the BIC on the same row.
 * Only the BIC column is usable; treat this list as SKNBI membership by BIC and nothing more.
 */
export const parseSknbi = (pdf: Uint8Array) => parseParticipantPdf(pdf, SKNBI_COLUMNS);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ?? "sources/raw/sknbi.pdf";
  console.log(JSON.stringify(await parseSknbi(readFileSync(file)), null, 2));
}
