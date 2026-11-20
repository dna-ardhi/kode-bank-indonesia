import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Institution } from "../../src/index.ts";
import type { Participant, ParticipantList } from "../lib/pdf-table.ts";
import { validate } from "../validate.ts";
import { parseAspiQris, type QrisList } from "./parse-aspi-qris.ts";
import { parseBifast } from "./parse-bifast.ts";
import { normName, type OjkBank, parseOjkBanks } from "./parse-ojk.ts";
import { type OjkBpr, parseOjkBpr } from "./parse-ojk-bpr.ts";
import { parseSknbi } from "./parse-sknbi.ts";

export type Change =
  | { kind: "added"; bic: string; id: string; name: string }
  | { kind: "removed"; bic: string; id: string; name: string }
  | { kind: "renamed"; bic: string; id: string; from: string; to: string }
  | { kind: "sknbi-joined"; bic: string; id: string }
  | { kind: "sknbi-left"; bic: string; id: string }
  | { kind: "sknbi-unknown"; bic: string }
  | { kind: "ojk-fill"; id: string; code: string; ojkName: string }
  | { kind: "ojk-conflict"; id: string; ours: string; code: string; ojkName: string }
  | { kind: "ojk-new"; code: string; ojkName: string }
  | { kind: "qris-apps"; id: string; apps: string[]; applied: boolean }
  | { kind: "qris-new"; operator: string; apps: string[] }
  | { kind: "bpr-added"; id: string; code: string; name: string }
  | { kind: "bpr-removed"; id: string; code: string; name: string }
  | { kind: "bpr-renamed"; id: string; from: string; to: string };

export type Evidence = {
  records: Record<
    string,
    { bank_code: string | null; confirmed: boolean; votes: Record<string, string[]>; matches: string[] }
  >;
};

export type DiffInput = {
  bifast: ParticipantList;
  sknbi: ParticipantList;
  banks: Institution[];
  ewallets: Institution[];
  /** BICs deliberately not published (sources/ignored-bics.json). */
  ignored: Record<string, string>;
  /** OJK "Sandi Bank" list. Report only: bank_code is never rewritten here. */
  ojk?: OjkBank[];
  /** ASPI QRIS directory. Report only: app names for review, and e-wallet operators not in the data. */
  qris?: QrisList;
  /** data/bprs.json and OJK's BPR / BPRS lists. Additions and renames are applied (never safe); removals are reported. */
  bprs?: Institution[];
  ojkBpr?: { bpr: OjkBpr[]; bprs: OjkBpr[] };
  /** sources/bank-codes.json; when given, applied OJK codes are recorded in the returned copy. */
  evidence?: Evidence;
  today: string;
};

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(pt|tbk|persero)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const withSource = (sources: string[], key: string, on: boolean) =>
  on ? (sources.includes(key) ? sources : [...sources, key]) : sources.filter((s) => s !== key);

/**
 * Compares parsed BI lists with data/ and proposes record changes. Every record it touches gets
 * verified: false. It never deletes or deactivates a record: leaving BI-FAST isn't proof of a
 * closure, so a human decides on status and merged_into. SKNBI is used for membership only (its
 * names are unreliable, see parse-sknbi.ts).
 *
 * Two kinds of change are applied automatically because they are low risk: an OJK "Sandi Bank" for a
 * bank that has no bank_code yet, and ASPI app names as aliases of an already matched record (not
 * one that has brand records of its own, e.g. Jenius under SMBC). `safe` is true when nothing else
 * changed (e-wallet candidates from ASPI are only listed), so CI may merge without a human.
 */
export function diffSources(input: DiffInput) {
  const banks: Institution[] = structuredClone(input.banks);
  const ewallets: Institution[] = structuredClone(input.ewallets);
  const bprs: Institution[] = structuredClone(input.bprs ?? []);
  const evidence = input.evidence ? structuredClone(input.evidence) : undefined;
  const existing = [...banks, ...ewallets];
  const { ignored, today } = input;
  const changes: Change[] = [];

  const byBic = new Map<string, Institution>();
  for (const r of existing) {
    if (r.bic) byBic.set(r.bic, r);
    if (r.sknbi_bic) byBic.set(r.sknbi_bic, r);
  }
  const ids = new Set(existing.map((r) => r.id));
  const fastBics = new Set(input.bifast.rows.map((r) => r.bic));
  const sknbiBics = new Set(input.sknbi.rows.map((r) => r.bic));
  const touch = (r: Institution) => {
    r.verified = false;
    r.updated_at = today;
  };

  const stub = (row: Participant): Institution => {
    let id = slug(row.name);
    for (let n = 2; ids.has(id); n++) id = `${slug(row.name)}-${n}`;
    ids.add(id);
    const sknbi = sknbiBics.has(row.bic);
    return {
      id,
      type: "bank",
      category: "commercial", // placeholder: the PR report asks the reviewer to set it
      name: row.name,
      display_name: row.name,
      aliases: [],
      parent_id: null,
      bank_code: null,
      bic: row.bic,
      bi_fast: true,
      sknbi,
      account_number: { kind: "account", label: "Nomor rekening" },
      logo: null,
      status: "active",
      merged_into: null,
      sources: sknbi ? ["bi-fast", "sknbi"] : ["bi-fast"],
      verified: false,
      updated_at: today,
    };
  };

  for (const row of input.bifast.rows) {
    if (ignored[row.bic]) continue;
    const r = byBic.get(row.bic);
    if (!r) {
      const rec = stub(row);
      banks.push(rec);
      changes.push({ kind: "added", bic: row.bic, id: rec.id, name: row.name });
      continue;
    }
    if (r.bic === row.bic && r.name !== row.name) {
      changes.push({ kind: "renamed", bic: row.bic, id: r.id, from: r.name, to: row.name });
      r.name = row.name;
      touch(r);
    }
    if (!r.bi_fast) {
      r.bi_fast = true;
      r.sources = withSource(r.sources, "bi-fast", true);
      touch(r);
    }
  }

  for (const r of existing) {
    if (!r.bic) continue; // brands mirror their parent below
    if (r.bi_fast && !fastBics.has(r.bic)) {
      changes.push({ kind: "removed", bic: r.bic, id: r.id, name: r.name });
      r.bi_fast = false;
      r.sources = withSource(r.sources, "bi-fast", false);
      touch(r);
    }
    const inSknbi = sknbiBics.has(r.sknbi_bic ?? r.bic);
    if (inSknbi !== r.sknbi) {
      changes.push({ kind: inSknbi ? "sknbi-joined" : "sknbi-left", bic: r.sknbi_bic ?? r.bic, id: r.id });
      r.sknbi = inSknbi;
      r.sources = withSource(r.sources, "sknbi", inSknbi);
      touch(r);
    }
  }
  for (const bic of sknbiBics) {
    if (!byBic.has(bic) && !fastBics.has(bic) && !ignored[bic]) changes.push({ kind: "sknbi-unknown", bic });
  }

  // OJK is the primary source for bank_code, but a human applies it: report fills, conflicts and unknowns.
  const legal = banks.filter((r) => !r.parent_id && r.category !== "sharia-unit");
  for (const o of input.ojk ?? []) {
    if (legal.some((r) => r.bank_code === o.code)) continue;
    const named = legal.filter((r) =>
      [r.name, r.display_name, ...r.aliases].some((n) => normName(n) === normName(o.name)),
    );
    if (named.length !== 1) changes.push({ kind: "ojk-new", code: o.code, ojkName: o.name });
    else if (named[0].bank_code)
      changes.push({
        kind: "ojk-conflict",
        id: named[0].id,
        ours: named[0].bank_code,
        code: o.code,
        ojkName: o.name,
      });
    else {
      const r = named[0];
      r.bank_code = o.code;
      r.sources = withSource(r.sources, "ojk", true);
      touch(r);
      if (evidence) {
        evidence.records[r.id] ??= { bank_code: null, confirmed: false, votes: {}, matches: [] };
        const e = evidence.records[r.id];
        e.bank_code = o.code;
        e.confirmed = true;
        e.votes[o.code] ??= [];
        e.votes[o.code].push("ojk");
        e.matches.push(`ojk: ${o.name} → ${o.code}`);
      }
      changes.push({ kind: "ojk-fill", id: r.id, code: o.code, ojkName: o.name });
    }
  }

  // ASPI QRIS: operator -> app names. Report only, a human decides what becomes an alias or a record.
  if (input.qris) {
    const all = [...banks, ...ewallets];
    const named = (operator: string) =>
      all.filter((r) =>
        [r.name, r.display_name, ...r.aliases].some((n) => normName(n) === normName(operator)),
      );
    for (const { operator, apps } of [...input.qris.banks, ...input.qris.nonBanks]) {
      const rs = named(operator);
      const known = new Set(rs.flatMap((r) => [r.display_name, ...r.aliases]).map((n) => n.toLowerCase()));
      const fresh = apps.filter((a) => !known.has(a.toLowerCase()));
      if (rs.length === 1 && fresh.length) {
        const r = rs[0];
        const hasBrands = all.some((x) => x.parent_id === r.id && x.category !== "sharia-unit");
        if (!hasBrands) {
          r.aliases.push(...fresh);
          r.sources = withSource(r.sources, "aspi-qris", true);
          r.updated_at = today; // aliases are editorial: verified stays as it is
        }
        changes.push({ kind: "qris-apps", id: r.id, apps: fresh, applied: !hasBrands });
      } else if (rs.length === 0 && apps.length && input.qris.nonBanks.some((e) => e.operator === operator))
        changes.push({ kind: "qris-new", operator, apps });
    }
  }

  // BPR / BPRS: OJK sandi is the identity, so ids are `bpr-<sandi>` and never depend on a name.
  for (const kind of ["bpr", "bprs"] as const) {
    const list = input.ojkBpr?.[kind];
    if (!list) continue;
    const have = new Map(bprs.filter((r) => r.category === kind).map((r) => [r.ojk_code, r]));
    for (const o of list) {
      const r = have.get(o.code);
      if (!r) {
        const rec: Institution = {
          id: `${kind}-${o.code}`,
          type: "bank",
          category: kind,
          name: o.name,
          display_name: o.name.replace(/^PT\.?\s+/i, ""),
          aliases: [],
          parent_id: null,
          bank_code: null,
          bic: null,
          ojk_code: o.code,
          bi_fast: false,
          sknbi: false,
          account_number: { kind: "account", label: "Nomor rekening" },
          logo: null,
          status: "active",
          merged_into: null,
          sources: ["ojk"],
          verified: false,
          updated_at: today,
        };
        bprs.push(rec);
        changes.push({ kind: "bpr-added", id: rec.id, code: o.code, name: o.name });
      } else if (r.name !== o.name) {
        changes.push({ kind: "bpr-renamed", id: r.id, from: r.name, to: o.name });
        r.name = o.name;
        touch(r);
      }
    }
    const listed = new Set(list.map((o) => o.code));
    for (const r of have.values())
      if (r.status === "active" && r.ojk_code && !listed.has(r.ojk_code))
        changes.push({ kind: "bpr-removed", id: r.id, code: r.ojk_code, name: r.name });
  }

  // Brands (no BIC of their own) carry their parent's network flags.
  const byId = new Map([...banks, ...ewallets].map((r) => [r.id, r]));
  for (const r of banks) {
    const parent = r.parent_id && !r.bic ? byId.get(r.parent_id) : undefined;
    if (parent && (r.bi_fast !== parent.bi_fast || r.sknbi !== parent.sknbi)) {
      r.bi_fast = parent.bi_fast;
      r.sknbi = parent.sknbi;
      r.updated_at = today;
    }
  }

  // Informational, never blocking: qris-new (unlisted operators stay unlisted until someone checks the BI
  // register) and qris-apps that were not applied (the record has brand records of its own).
  const safe = changes.every((c) => c.kind === "ojk-fill" || c.kind === "qris-new" || c.kind === "qris-apps");
  return { banks, ewallets, bprs, evidence, changes, safe, report: report(input, changes) };
}

function report({ bifast, sknbi }: DiffInput, changes: Change[]) {
  const of = <K extends Change["kind"]>(k: K) =>
    changes.filter((c): c is Extract<Change, { kind: K }> => c.kind === k);
  const code = (s: string) => `\`${s.replace(/`/g, "")}\``;
  const lines = [
    "## Official source sync",
    "",
    `BI-FAST edition **${bifast.as_of}** (${bifast.rows.length} participants) · SKNBI edition **${sknbi.as_of}** (${sknbi.rows.length} participants)`,
    "",
  ];
  const section = (title: string, head: string, rows: string[]) => {
    if (rows.length)
      lines.push(`### ${title} (${rows.length})`, "", head, head.replace(/[^|]+/g, "---"), ...rows, "");
  };
  section(
    "Added to BI-FAST",
    "| BIC | Name | Proposed id |",
    of("added").map((c) => `| ${code(c.bic)} | ${c.name} | ${code(c.id)} |`),
  );
  section(
    "Removed from BI-FAST",
    "| BIC | id | Name |",
    of("removed").map((c) => `| ${code(c.bic)} | ${code(c.id)} | ${c.name} |`),
  );
  section(
    "Renamed",
    "| BIC | id | Old name | New name |",
    of("renamed").map((c) => `| ${code(c.bic)} | ${code(c.id)} | ${c.from} | ${c.to} |`),
  );
  section(
    "SKNBI membership changed",
    "| BIC | id | Change |",
    [...of("sknbi-joined"), ...of("sknbi-left")].map(
      (c) => `| ${code(c.bic)} | ${code(c.id)} | ${c.kind === "sknbi-joined" ? "joined" : "left"} |`,
    ),
  );
  section(
    "SKNBI-only BICs not in data",
    "| BIC |",
    of("sknbi-unknown").map((c) => `| ${code(c.bic)} |`),
  );

  section(
    "OJK bank code applied (the bank had none)",
    "| id | Sandi Bank | OJK name |",
    of("ojk-fill").map((c) => `| ${code(c.id)} | ${code(c.code)} | ${c.ojkName} |`),
  );
  section(
    "OJK disagrees with our bank code",
    "| id | Ours | OJK | OJK name |",
    of("ojk-conflict").map((c) => `| ${code(c.id)} | ${code(c.ours)} | ${code(c.code)} | ${c.ojkName} |`),
  );
  section(
    "OJK banks not in data",
    "| Sandi Bank | OJK name |",
    of("ojk-new").map((c) => `| ${code(c.code)} | ${c.ojkName} |`),
  );

  section(
    "BPR / BPRS added (OJK)",
    "| id | Sandi | Name |",
    of("bpr-added").map((c) => `| ${code(c.id)} | ${code(c.code)} | ${c.name} |`),
  );
  section(
    "BPR / BPRS renamed (OJK)",
    "| id | Old name | New name |",
    of("bpr-renamed").map((c) => `| ${code(c.id)} | ${c.from} | ${c.to} |`),
  );
  section(
    "BPR / BPRS no longer in OJK's list",
    "| id | Sandi | Name |",
    of("bpr-removed").map((c) => `| ${code(c.id)} | ${code(c.code)} | ${c.name} |`),
  );
  section(
    "ASPI QRIS: app names",
    "| id | App names | Added as aliases |",
    of("qris-apps").map(
      (c) =>
        `| ${code(c.id)} | ${c.apps.join(", ")} | ${c.applied ? "yes" : "no: has brand records, add by hand"} |`,
    ),
  );
  section(
    "ASPI QRIS: e-wallet operators not in the data",
    "| Operator | App names |",
    of("qris-new").map((c) => `| ${c.operator} | ${c.apps.join(", ")} |`),
  );

  if (changes.length === 0) {
    lines.push("No participant changes. Only the source files' hashes changed.", "");
  } else {
    lines.push(
      "### Review checklist",
      "",
      "- [ ] New records: set `id`, `category`, `display_name`, `aliases`, and `bank_code` (with evidence in `sources/bank-codes.json`). Move e-wallet operators to `ewallets.json` or list them in `sources/ignored-bics.json`.",
      "- [ ] OJK sections: a code applied to a bank that had none was matched by name, so check it is the same bank; for a conflict, decide which is right and update `sources/bank-codes.json`.",
      "- [ ] ASPI QRIS sections: app names were added as aliases only to records whose name matches the operator; before adding an e-wallet, check its licence on the BI register by hand and that it can receive bank transfers.",
      "- [ ] BPR / BPRS: an added bank is a permanent id; a bank missing from OJK's list may be closed or merged, so check before setting `status` / `merged_into`.",
      "- [ ] Removed participants: check whether the bank closed, merged or rebranded, and set `status` / `merged_into` if so. Records are never deleted.",
      "- [ ] Renames: update `display_name` / `aliases` if the brand changed.",
      "- [ ] Set `verified: true` again only for records that meet the rule in AGENTS.md.",
      "",
    );
  }
  return lines.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL("../../", import.meta.url);
  const read = (p: string) => readFileSync(new URL(p, root));
  const json = (p: string) => JSON.parse(read(p).toString("utf8"));
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };

  const ojkBpr = () => {
    const f = (k: string) => new URL(`sources/raw/ojk-${k}.xlsx`, root);
    return existsSync(f("bpr")) && existsSync(f("bprs"))
      ? {
          bpr: parseOjkBpr(read("sources/raw/ojk-bpr.xlsx")),
          bprs: parseOjkBpr(read("sources/raw/ojk-bprs.xlsx")),
        }
      : undefined;
  };
  const result = diffSources({
    bifast: await parseBifast(read("sources/raw/bi-fast.pdf")),
    sknbi: await parseSknbi(read("sources/raw/sknbi.pdf")),
    banks: json("data/banks.json"),
    ewallets: json("data/ewallets.json"),
    bprs: json("data/bprs.json"),
    ojkBpr: ojkBpr(),
    ignored: json("sources/ignored-bics.json"),
    evidence: json("sources/bank-codes.json"),
    ojk: existsSync(new URL("sources/raw/ojk-bank-umum.xlsx", root))
      ? parseOjkBanks(read("sources/raw/ojk-bank-umum.xlsx"))
      : undefined,
    qris: existsSync(new URL("sources/raw/aspi-qris.html", root))
      ? parseAspiQris(read("sources/raw/aspi-qris.html").toString("utf8"))
      : undefined,
    today: new Date().toISOString().slice(0, 10),
  });
  const errors = validate(result.banks, result.ewallets, result.bprs);
  if (errors.length) throw new Error(`proposed data is invalid:\n${errors.join("\n")}`);

  if (process.argv.includes("--write")) {
    for (const f of ["banks", "ewallets", "bprs"] as const) {
      writeFileSync(new URL(`data/${f}.json`, root), `${JSON.stringify(result[f], null, 2)}\n`);
    }
    writeFileSync(new URL("sources/bank-codes.json", root), `${JSON.stringify(result.evidence, null, 2)}\n`);
  }
  const safeOut = arg("--safe-out");
  if (safeOut) writeFileSync(safeOut, `${result.safe ? "safe" : "review"}\n`);
  const out = arg("--report");
  if (out) writeFileSync(out, result.report);
  else console.log(result.report);
  console.error(`${result.changes.length} change(s)`);
}
