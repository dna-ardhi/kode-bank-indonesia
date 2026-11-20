import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import banksJson from "../data/banks.json" with { type: "json" };
import ewalletsJson from "../data/ewallets.json" with { type: "json" };
import type { ParticipantList } from "../scripts/lib/pdf-table.ts";
import { diffSources, type Evidence } from "../scripts/sync/diff.ts";
import { parseAspiQris } from "../scripts/sync/parse-aspi-qris.ts";
import { parseBifast } from "../scripts/sync/parse-bifast.ts";
import { parseOjkBanks } from "../scripts/sync/parse-ojk.ts";
import { parseSknbi } from "../scripts/sync/parse-sknbi.ts";
import { validate } from "../scripts/validate.ts";
import ignored from "../sources/ignored-bics.json" with { type: "json" };
import type { Institution } from "../src/index.ts";

const fixture = (f: string) => readFileSync(new URL(`fixtures/${f}`, import.meta.url));
const bifast = await parseBifast(fixture("bi-fast-2026-09-24.pdf"));
const sknbi = await parseSknbi(fixture("sknbi-2026-09-24.pdf"));
const qris = parseAspiQris(fixture("aspi-qris-2026-11-21.html").toString("utf8"));
const ojk = parseOjkBanks(fixture("ojk-bank-umum-2026-06.xlsx"));
const banks = banksJson as Institution[];
const ewallets = ewalletsJson as Institution[];
const today = "2030-01-01";

const run = (over: { bifast?: ParticipantList; sknbi?: ParticipantList } = {}) =>
  diffSources({ bifast, sknbi, banks, ewallets, ignored, today, ...over });
const without = (list: ParticipantList, bic: string) => ({
  ...list,
  rows: list.rows.filter((r) => r.bic !== bic),
});
const find = (rs: Institution[], id: string) => rs.find((r) => r.id === id);

describe("diffSources", () => {
  it("finds no changes between the seed data and the lists it came from", () => {
    const r = run();
    expect(r.changes).toEqual([]);
    expect(r.banks).toEqual(banks);
    expect(r.ewallets).toEqual(ewallets);
    expect(r.report).toContain("No participant changes");
  });

  it("proposes a stub record for a new participant", () => {
    const row = { bic: "NEWBIDJ1", name: "PT BANK CONTOH INDONESIA, TBK", services: ["credit-transfer"] };
    const r = run({ bifast: { ...bifast, rows: [...bifast.rows, row] } });
    expect(r.changes).toEqual([
      { kind: "added", bic: "NEWBIDJ1", id: "bank-contoh-indonesia", name: row.name },
    ]);
    expect(find(r.banks, "bank-contoh-indonesia")).toMatchObject({
      bic: "NEWBIDJ1",
      sknbi: false,
      verified: false,
    });
    expect(validate(r.banks, r.ewallets)).toEqual([]);
    expect(r.report).toContain("### Added to BI-FAST (1)");
  });

  it("updates the name on a rename, keyed by BIC", () => {
    const rows = bifast.rows.map((r) => (r.bic === "CENAIDJA" ? { ...r, name: "PT BANK BCA BARU TBK" } : r));
    const r = run({ bifast: { ...bifast, rows } });
    expect(r.changes).toEqual([
      {
        kind: "renamed",
        bic: "CENAIDJA",
        id: "bca",
        from: "PT. BANK CENTRAL ASIA Tbk.",
        to: "PT BANK BCA BARU TBK",
      },
    ]);
    expect(find(r.banks, "bca")).toMatchObject({
      name: "PT BANK BCA BARU TBK",
      verified: false,
      updated_at: today,
    });
  });

  it("flags but never deactivates a participant that left BI-FAST", () => {
    const r = run({ bifast: without(bifast, "SUNIIDJA") });
    expect(r.changes.map((c) => c.kind)).toEqual(["removed"]);
    expect(find(r.banks, "smbc-indonesia")).toMatchObject({
      bi_fast: false,
      status: "active",
      sources: ["sknbi", "ojk"],
    });
    expect(find(r.banks, "jenius")?.bi_fast).toBe(false); // brand follows its parent
    expect(validate(r.banks, r.ewallets)).toEqual([]);
  });

  it("tracks SKNBI membership through sknbi_bic", () => {
    const r = run({ sknbi: without(sknbi, "PDKSIDBB") });
    expect(r.changes).toEqual([{ kind: "sknbi-left", bic: "PDKSIDBB", id: "bank-kalsel" }]);
    expect(find(r.banks, "bank-kalsel")).toMatchObject({ sknbi: false, sources: ["bi-fast", "ojk"] });
  });

  it("reports unknown SKNBI-only BICs without inventing records", () => {
    const r = run({
      sknbi: { ...sknbi, rows: [...sknbi.rows, { bic: "ZZZZIDJ1", name: "?", services: [] }] },
    });
    expect(r.changes).toEqual([{ kind: "sknbi-unknown", bic: "ZZZZIDJ1" }]);
    expect(r.banks).toEqual(banks);
  });
});

describe("diffSources with OJK", () => {
  const run = (list = ojk, over: { banks?: Institution[]; evidence?: Evidence } = {}) =>
    diffSources({ bifast, sknbi, banks, ewallets, ignored, ojk: list, today, ...over });

  it("finds no OJK changes: every OJK code is already in the data", () => {
    const r = run();
    expect(r.changes).toEqual([]);
    expect(r.banks).toEqual(banks);
    expect(r.safe).toBe(true);
  });

  it("applies the code for a bank that has none, and records the evidence", () => {
    const stripped = banks.map((b) => (b.id === "hibank" ? { ...b, bank_code: null } : b));
    const evidence = { records: { hibank: { bank_code: null, confirmed: false, votes: {}, matches: [] } } };
    const r = run(ojk, { banks: stripped, evidence });
    expect(r.changes).toEqual([
      { kind: "ojk-fill", id: "hibank", code: "553", ojkName: "PT BANK HIBANK INDONESIA" },
    ]);
    expect(find(r.banks, "hibank")).toMatchObject({ bank_code: "553", verified: false, updated_at: today });
    expect(find(r.banks, "hibank")?.sources).toContain("ojk");
    expect(r.evidence?.records.hibank).toMatchObject({
      bank_code: "553",
      confirmed: true,
      votes: { "553": ["ojk"] },
    });
    expect(r.safe).toBe(true);
    expect(validate(r.banks, r.ewallets)).toEqual([]);
  });

  it("reports a conflict without rewriting the code, and needs review", () => {
    const bca = ojk.map((o) => (o.code === "014" ? { ...o, code: "999" } : o));
    const r = run(bca);
    expect(r.changes).toEqual([
      { kind: "ojk-conflict", id: "bca", ours: "014", code: "999", ojkName: "PT BANK CENTRAL ASIA Tbk" },
    ]);
    expect(find(r.banks, "bca")?.bank_code).toBe("014");
    expect(r.report).toContain("OJK disagrees with our bank code (1)");
    expect(r.safe).toBe(false);
  });

  it("reports an OJK bank the data has never heard of, and needs review", () => {
    const r = run([...ojk, { code: "888", name: "PT BANK BARU" }]);
    expect(r.changes).toEqual([{ kind: "ojk-new", code: "888", ojkName: "PT BANK BARU" }]);
    expect(r.safe).toBe(false);
  });
});

describe("diffSources with ASPI QRIS", () => {
  const run = (q = qris) => diffSources({ bifast, sknbi, banks, ewallets, ignored, qris: q, today });
  const changes = (q = qris) => run(q).changes;
  const bcaApps = (apps: string[]) =>
    qris.banks.map((e) => (e.operator === "PT Bank Central Asia, Tbk" ? { ...e, apps } : e));

  it("applies nothing to the current data and stays safe", () => {
    const r = run();
    expect(r.banks).toEqual(banks);
    expect(r.ewallets).toEqual(ewallets);
    expect(r.changes.filter((c) => c.kind === "qris-apps" && c.applied)).toEqual([]);
    expect(r.safe).toBe(true);
  });

  it("matches the e-wallets we already have, so they are not reported as new", () => {
    const operators = changes().flatMap((c) => (c.kind === "qris-new" ? [c.operator] : []));
    for (const o of [
      "PT Dompet Anak Bangsa",
      "PT Visionet Internasional",
      "PT Espay Debit Indonesia Koe",
      "PT Astra Digital Arta",
    ])
      expect(operators).not.toContain(o);
    expect(operators).toContain("PT Capital Net Indonesia");
  });

  it("skips switching companies, which have no app name", () => {
    const operators = changes().flatMap((c) => (c.kind === "qris-new" ? [c.operator] : []));
    expect(operators).not.toContain("PT Alto Network");
  });

  it("adds only the app names we don't have yet as aliases", () => {
    const r = run({ ...qris, banks: bcaApps(["myBCA", "BCA Baru"]) });
    expect(r.changes).toContainEqual({ kind: "qris-apps", id: "bca", apps: ["BCA Baru"], applied: true });
    expect(find(r.banks, "bca")?.aliases).toContain("BCA Baru");
    expect(find(r.banks, "bca")).toMatchObject({ verified: true, updated_at: today });
    expect(r.safe).toBe(true);
  });

  it("does not touch a record that has brand records of its own", () => {
    const smbc = qris.banks.map((e) =>
      e.operator === "PT Bank BTPN Tbk" ? { ...e, apps: ["Jenius QR", "BTPN Baru"] } : e,
    );
    const r = run({ ...qris, banks: smbc });
    expect(r.changes).toContainEqual({
      kind: "qris-apps",
      id: "smbc-indonesia",
      apps: ["Jenius QR", "BTPN Baru"],
      applied: false,
    });
    expect(find(r.banks, "smbc-indonesia")?.aliases).not.toContain("BTPN Baru");
    expect(r.safe).toBe(true); // listed for a human glance, not blocking
  });
});
