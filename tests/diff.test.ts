import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import banksJson from "../data/banks.json" with { type: "json" };
import ewalletsJson from "../data/ewallets.json" with { type: "json" };
import type { ParticipantList } from "../scripts/lib/pdf-table.ts";
import { diffSources } from "../scripts/sync/diff.ts";
import { parseBifast } from "../scripts/sync/parse-bifast.ts";
import { parseSknbi } from "../scripts/sync/parse-sknbi.ts";
import { validate } from "../scripts/validate.ts";
import ignored from "../sources/ignored-bics.json" with { type: "json" };
import type { Institution } from "../src/index.ts";

const fixture = (f: string) => readFileSync(new URL(`fixtures/${f}`, import.meta.url));
const bifast = await parseBifast(fixture("bi-fast-2026-09-24.pdf"));
const sknbi = await parseSknbi(fixture("sknbi-2026-09-24.pdf"));
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
      sources: ["sknbi"],
    });
    expect(find(r.banks, "jenius")?.bi_fast).toBe(false); // brand follows its parent
    expect(validate(r.banks, r.ewallets)).toEqual([]);
  });

  it("tracks SKNBI membership through sknbi_bic", () => {
    const r = run({ sknbi: without(sknbi, "PDKSIDBB") });
    expect(r.changes).toEqual([{ kind: "sknbi-left", bic: "PDKSIDBB", id: "bank-kalsel" }]);
    expect(find(r.banks, "bank-kalsel")).toMatchObject({ sknbi: false, sources: ["bi-fast"] });
  });

  it("reports unknown SKNBI-only BICs without inventing records", () => {
    const r = run({
      sknbi: { ...sknbi, rows: [...sknbi.rows, { bic: "ZZZZIDJ1", name: "?", services: [] }] },
    });
    expect(r.changes).toEqual([{ kind: "sknbi-unknown", bic: "ZZZZIDJ1" }]);
    expect(r.banks).toEqual(banks);
  });
});
