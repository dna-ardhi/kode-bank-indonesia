import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type Participant = { bic: string; name: string; services: string[] };
export type ParticipantList = { as_of: string; rows: Participant[] };
/** `header` is a text item that appears once per page above the column, e.g. "Bulk Credit". */
export type ServiceColumn = { key: string; header: string };

type Item = { s: string; x: number; y: number; cx: number };

const BIC = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;
const CHECK = "✓";
const LINE_TOLERANCE = 2; // pt; items on one table row share a baseline
const COLUMN_TOLERANCE = 30; // pt; max distance from a checkmark to its header's center

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  mei: 5,
  may: 5,
  jun: 6,
  jul: 7,
  agu: 8,
  ags: 8,
  aug: 8,
  sep: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  des: 12,
  dec: 12,
};

/** "24 Sept 2026" / "1 Agustus 2026" -> "2026-09-24". Throws if unrecognised. */
export function parseIndonesianDate(text: string): string {
  const m = text.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/);
  const month = m && MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!m || !month) throw new Error(`unrecognised date "${text}"`);
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/**
 * Parses a BI participant table (No | BIC | Nama | one ✓ column per service).
 * Strict on purpose: any layout surprise throws instead of silently dropping rows.
 */
export async function parseParticipantPdf(
  pdf: Uint8Array,
  columns: ServiceColumn[],
): Promise<ParticipantList> {
  // pdfjs takes ownership of (and may detach) the buffer, so hand it a copy.
  const task = getDocument({ data: new Uint8Array(pdf), verbosity: 0 });
  const doc = await task.promise;
  const rows: Participant[] = [];
  let asOf: string | undefined;

  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const where = `page ${p}`;
      const content = await (await doc.getPage(p)).getTextContent();
      const items: Item[] = content.items
        .filter((i) => "str" in i && i.str.trim() !== "")
        .map((i) => {
          const t = i as { str: string; transform: number[]; width: number };
          return { s: t.str.trim(), x: t.transform[4], y: t.transform[5], cx: t.transform[4] + t.width / 2 };
        });

      const headers = columns.map((c) => {
        const found = items.filter((i) => i.s === c.header);
        if (found.length !== 1)
          throw new Error(`${where}: expected 1 header "${c.header}", found ${found.length}`);
        return { key: c.key, ...found[0] };
      });
      const firstServiceX = Math.min(...headers.map((h) => h.cx)) - COLUMN_TOLERANCE;
      const isRowStart = (l: Item[]) => /^\d+$/.test(l[0].s) && BIC.test(l[1]?.s ?? "");
      let inBody = false;

      for (const line of groupLines(items)) {
        // Title and multi-line headers sit above the first row; a row lost here fails the sequence check.
        inBody ||= isRowStart(line);
        if (!inBody) continue;
        const text = line.map((i) => i.s).join(" ");
        const footer = text.match(/^Per\s+(.+)$/);
        if (footer) {
          asOf = parseIndonesianDate(footer[1]);
          continue;
        }

        const [no, bic, ...rest] = line;
        if (!isRowStart(line)) {
          throw new Error(`${where}: unexpected line "${text}"`);
        }
        if (Number(no.s) !== rows.length + 1) {
          throw new Error(`${where}: row number ${no.s} out of sequence (expected ${rows.length + 1})`);
        }
        const nameParts = rest.filter((i) => i.s !== CHECK);
        const checks = rest.filter((i) => i.s === CHECK);
        if (nameParts.length === 0) throw new Error(`${where}: row ${no.s} (${bic.s}) has no name`);
        const stray = nameParts.find((i) => i.x >= firstServiceX);
        if (stray)
          throw new Error(`${where}: row ${no.s} has unexpected text "${stray.s}" in service columns`);

        const services = checks.map((c) => {
          const nearest = headers.reduce((a, b) => (Math.abs(b.cx - c.cx) < Math.abs(a.cx - c.cx) ? b : a));
          if (Math.abs(nearest.cx - c.cx) > COLUMN_TOLERANCE) {
            throw new Error(`${where}: row ${no.s} has a checkmark outside any service column`);
          }
          return nearest.key;
        });
        if (new Set(services).size !== services.length) {
          throw new Error(`${where}: row ${no.s} has two checkmarks in one column`);
        }
        rows.push({
          bic: bic.s,
          name: nameParts
            .map((i) => i.s)
            .join(" ")
            .replace(/\s+/g, " "),
          services: columns.map((c) => c.key).filter((k) => services.includes(k)),
        });
      }
    }
  } finally {
    await task.destroy();
  }

  if (rows.length === 0) throw new Error("no participant rows found");
  if (!asOf) throw new Error('no "Per <date>" footer found');
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.bic)) throw new Error(`duplicate BIC ${r.bic}`);
    seen.add(r.bic);
  }
  return { as_of: asOf, rows };
}

/** Groups items into lines (top to bottom), each sorted left to right. */
function groupLines(items: Item[]): Item[][] {
  const lines: Item[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.at(-1);
    if (line && Math.abs(line[0].y - item.y) <= LINE_TOLERANCE) line.push(item);
    else lines.push([item]);
  }
  return lines.map((l) => l.sort((a, b) => a.x - b.x));
}
