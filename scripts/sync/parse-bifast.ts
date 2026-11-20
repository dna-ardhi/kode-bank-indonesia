import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseParticipantPdf, type ServiceColumn } from "../lib/pdf-table.ts";

export const BIFAST_COLUMNS: ServiceColumn[] = [
  { key: "credit-transfer", header: "Individual Credit" },
  { key: "bulk-credit-transfer", header: "Bulk Credit" },
  { key: "credit-transfer-rfp", header: "Credit Transfer for" },
  { key: "direct-debit", header: "Direct Debit" },
];

export const parseBifast = (pdf: Uint8Array) => parseParticipantPdf(pdf, BIFAST_COLUMNS);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ?? "sources/raw/bi-fast.pdf";
  console.log(JSON.stringify(await parseBifast(readFileSync(file)), null, 2));
}
