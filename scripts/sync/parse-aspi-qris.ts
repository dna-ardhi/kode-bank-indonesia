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
    if (tag === "h3") {
      const m = /^Penyelenggara Jasa Sistem Pembayaran \((BANK|NON BANK)\)$/.exec(text);
      if (!m) throw new Error(`unexpected h3 ${JSON.stringify(text)}`);
      current = groups[m[1] as "BANK" | "NON BANK"];
      seen++;
    } else {
      if (!current) throw new Error("operator heading before any group heading");
      current.push(text);
    }
  }
  if (seen !== 2) throw new Error(`expected 2 groups, got ${seen}`);
  const pairs = (list: string[], label: string): QrisEntry[] => {
    if (list.length === 0 || list.length % 2)
      throw new Error(`${label}: odd or empty heading count ${list.length}`);
    const out: QrisEntry[] = [];
    for (let i = 0; i < list.length; i += 2) {
      if (!/^PT\.? /i.test(list[i]))
        throw new Error(`${label}: not an operator name: ${JSON.stringify(list[i])}`);
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
