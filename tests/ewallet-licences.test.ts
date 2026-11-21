import { describe, expect, it } from "vitest";
import ewalletsJson from "../data/ewallets.json" with { type: "json" };
import { normName } from "../scripts/sync/parse-ojk.ts";
import licences from "../sources/ewallet-licences.json" with { type: "json" };
import type { Institution } from "../src/index.ts";

type Licence = Record<
  "operator" | "licence_no" | "licence_date" | "status" | "checked_at" | "operator_page" | "archived",
  string
>;
const records = licences.records as Record<string, Licence>;
const ewallets = ewalletsJson as Institution[];
const date = /^\d{4}-\d{2}-\d{2}$/;

describe("e-wallet licence checks (sources/ewallet-licences.json)", () => {
  it("backs every bi-pjp source with a complete check of the same operator", () => {
    for (const e of ewallets.filter((r) => r.sources.includes("bi-pjp"))) {
      const l = records[e.id];
      expect(l, e.id).toBeDefined();
      for (const v of Object.values(l)) expect(v, e.id).toBeTruthy();
      expect(normName(l.operator), e.id).toBe(normName(e.name));
      expect(l.status, e.id).toMatch(/^berizin$/i);
      expect(l.licence_date, e.id).toMatch(date);
      expect(l.checked_at, e.id).toMatch(date);
      expect(l.archived, e.id).toMatch(/^https:\/\/web\.archive\.org\//);
    }
  });

  it("has no check for an unknown e-wallet, or one whose sources lack bi-pjp", () => {
    for (const id of Object.keys(records))
      expect(ewallets.find((e) => e.id === id)?.sources, id).toContain("bi-pjp");
  });
});
