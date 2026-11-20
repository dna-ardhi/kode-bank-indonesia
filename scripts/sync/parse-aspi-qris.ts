import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type QrisEntry = { operator: string; apps: string[] };
export type QrisList = { banks: QrisEntry[]; nonBanks: QrisEntry[] };

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Parses ASPI's QRIS page: an h3 per group ("(BANK)" / "(NON BANK)"), then one h2 pair per operator
 * (legal name, then app names, blank for switching companies). Throws on any layout change.
 */
export function parseAspiQris(html: string): QrisList {
  const tokens = [...html.matchAll(/<(h2|h3)\b[^>]*>([^<]*)<\/\1>/g)].map((m) => ({
    tag: m[1],
    text: decode(m[2]),
  }));
  const groups: Record<"BANK" | "NON BANK", string[]> = { BANK: [], "NON BANK": [] };
  let current: string[] | undefined;
  let seen = 0;
  for (const { tag, text } of tokens) {
    const m = tag === "h3" ? /^Penyelenggara Jasa Sistem Pembayaran \((BANK|NON BANK)\)$/.exec(text) : null;
    if (m) {
      current = groups[m[1] as "BANK" | "NON BANK"];
      seen++;
    } else if (current) {
      if (tag === "h3") throw new Error(`unexpected h3 after the lists began: ${JSON.stringify(text)}`);
      current.push(text);
    } // else: FAQ headings before the first group
  }
  if (seen !== 2) throw new Error(`expected 2 groups, got ${seen}`);
  const isOperator = (s: string) => /^PT\.? /i.test(s);
  const pairs = (list: string[], label: string): QrisEntry[] => {
    // A footer heading follows the last list; it is not an operator.
    if (list.length % 2 && !isOperator(list[list.length - 1])) list = list.slice(0, -1);
    if (list.length === 0 || list.length % 2)
      throw new Error(`${label}: odd or empty heading count ${list.length}`);
    const out: QrisEntry[] = [];
    for (let i = 0; i < list.length; i += 2) {
      if (!isOperator(list[i])) throw new Error(`${label}: not an operator name: ${JSON.stringify(list[i])}`);
      out.push({ operator: list[i], apps: list[i + 1] ? list[i + 1].split(/\s*,\s*/) : [] });
    }
    return out;
  };
  return { banks: pairs(groups.BANK, "BANK"), nonBanks: pairs(groups["NON BANK"], "NON BANK") };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(
    JSON.stringify(
      parseAspiQris(readFileSync(process.argv[2] ?? "sources/raw/aspi-qris.html", "utf8")),
      null,
      2,
    ),
  );
}
