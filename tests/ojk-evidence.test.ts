import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import banksJson from "../data/banks.json" with { type: "json" };
import { parseOjkBanks } from "../scripts/sync/parse-ojk.ts";
import evidence from "../sources/bank-codes.json" with { type: "json" };
import type { Institution } from "../src/index.ts";

const ojk = parseOjkBanks(readFileSync(new URL("fixtures/ojk-bank-umum-2026-06.xlsx", import.meta.url)));
const legal = (banksJson as Institution[]).filter((b) => !b.parent_id && b.category !== "sharia-unit");
const records = evidence.records as Record<
  string,
  { bank_code: string | null; votes: Record<string, string[]> }
>;

describe("OJK Sandi Bank vs our data", () => {
  it("every OJK code belongs to exactly one legal bank record", () => {
    for (const o of ojk) expect(legal.filter((b) => b.bank_code === o.code).map((b) => b.id)).toHaveLength(1);
  });
  it("every such record cites OJK in the evidence file, under the same code", () => {
    for (const o of ojk) {
      const b = legal.find((r) => r.bank_code === o.code);
      expect(b?.sources, o.name).toContain("ojk");
      expect(records[b?.id ?? ""]?.votes[o.code], o.name).toContain("ojk");
    }
  });
  it("no legal bank has a code OJK does not list", () => {
    const codes = new Set(ojk.map((o) => o.code));
    for (const b of legal) if (b.bank_code) expect(codes.has(b.bank_code), b.id).toBe(true);
  });
});
