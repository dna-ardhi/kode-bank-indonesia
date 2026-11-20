import { inflateRawSync } from "node:zlib";

const un = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Reads every entry of a zip via its central directory (no zip64, no encryption). */
function unzip(buf: Uint8Array): Map<string, string> {
  const b = Buffer.from(buf);
  const eocd = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("not a zip file");
  const count = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const out = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error("bad zip central directory");
    const method = b.readUInt16LE(p + 10);
    const size = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30);
    const commentLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const name = b.toString("utf8", p + 46, p + 46 + nameLen);
    const data = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const raw = b.subarray(data, data + size);
    if (method !== 0 && method !== 8) throw new Error(`unsupported zip method ${method} for ${name}`);
    out.set(name, (method === 8 ? inflateRawSync(raw) : raw).toString("utf8"));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

/** Returns the cell text of every row (empty cells are ""), for the first visible sheet. */
export function readXlsx(buf: Uint8Array): string[][] {
  const files = unzip(buf);
  const get = (name: string) => {
    const f = files.get(name);
    if (f === undefined) throw new Error(`xlsx: missing ${name}`);
    return f;
  };
  const sheet = [...get("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].find((m) => !attr(m[0], "state"));
  if (!sheet) throw new Error("xlsx: no visible sheet");
  const rel = [...get("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].find(
    (m) => attr(m[0], "Id") === attr(sheet[0], "r:id"),
  );
  if (!rel) throw new Error("xlsx: sheet relationship not found");
  const target = attr(rel[0], "Target") ?? "";
  const strings = files.has("xl/sharedStrings.xml")
    ? [...get("xl/sharedStrings.xml").matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
        un([...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((t) => t[1]).join("")),
      )
    : [];

  const col = (ref: string) =>
    [...ref.replace(/\d+/, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const rows: string[][] = [];
  for (const [, , body] of get(`xl/${target.replace(/^\/?xl\//, "")}`).matchAll(
    /<row\b([^>]*)>(.*?)<\/row>/gs,
  )) {
    const row: string[] = [];
    for (const m of body.matchAll(/<c\b([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
      const inner = m[2] ?? "";
      const v = /<v>([^<]*)<\/v>/.exec(inner)?.[1];
      const t = attr(m[1], "t");
      const text =
        t === "s" && v !== undefined
          ? strings[Number(v)]
          : t === "inlineStr"
            ? un([...inner.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((x) => x[1]).join(""))
            : un(v ?? "");
      if (text === undefined) throw new Error("xlsx: bad shared string index");
      row[col(attr(m[1], "r") ?? "A1")] = text.trim();
    }
    rows.push(Array.from(row, (c) => c ?? ""));
  }
  return rows;
}
