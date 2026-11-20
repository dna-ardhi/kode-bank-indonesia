import { describe, expect, it } from "vitest";
import { matches, pickable } from "../docs/src/components/filter.ts";
import { all, type Institution } from "../src/index.ts";

describe("docs search filter", () => {
  it("returns every record for an empty query", () => {
    expect(matches("")).toHaveLength(all.length);
  });

  it.each(["🦊", "((((", ".*", "\\"])("matches nothing for punctuation- or emoji-only %j", (q) => {
    expect(matches(q)).toEqual([]);
  });

  it("still finds by name and by exact code", () => {
    expect(matches("  bca  ").length).toBeGreaterThan(0);
    expect(matches("014")[0]?.id).toBe("bca");
  });

  it("pickable drops inactive records and caps the list", () => {
    const base = all[0] as Institution;
    const rows = Array.from(
      { length: 12 },
      (_, i) => ({ ...base, id: `x${i}`, status: i % 2 ? "inactive" : "active" }) as Institution,
    );
    expect(pickable(rows).map((r) => r.status)).toEqual(Array(6).fill("active"));
    expect(pickable(rows, 2)).toHaveLength(2);
  });
});
