import { describe, expect, it } from "vitest";
import api from "../dist/v1/all.json" with { type: "json" };
import { all, banks, ewallets, findById, search } from "../src/index.ts";

const ids = (rs: readonly { id: string }[]) => rs.map((r) => r.id);

describe("package exports", () => {
  it("bundles the built API data", () => {
    expect(all).toEqual(api.data);
    expect(banks.length + ewallets.length).toBe(all.length);
    expect(banks.every((r) => r.type === "bank")).toBe(true);
    expect(ewallets.every((r) => r.type === "ewallet")).toBe(true);
  });

  it("finds records by id", () => {
    expect(findById("bca")?.bank_code).toBe("014");
    expect(findById("nope")).toBeUndefined();
  });
});

describe("search", () => {
  it("ranks exact matches first", () => {
    expect(search("bca")[0].id).toBe("bca");
    expect(search("Mandiri")[0].id).toBe("mandiri"); // alias "Mandiri" beats "Bank Mandiri Taspen"
  });

  it("matches bank codes and BICs exactly", () => {
    expect(search("014")[0].id).toBe("bca");
    expect(search("cenaidja")[0].id).toBe("bca");
    expect(search("PDKSIDBB")[0].id).toBe("bank-kalsel"); // sknbi_bic
  });

  it("ignores case, punctuation and accents", () => {
    expect(ids(search("bank-central asia"))).toContain("bca");
    expect(ids(search("ÓCBC"))).toContain("ocbc-nisp");
  });

  it("finds brands and e-wallets", () => {
    expect(search("jenius")[0]).toMatchObject({ id: "jenius", parent_id: "smbc-indonesia" });
    expect(search("dana")[0].id).toBe("dana");
  });

  it("returns everything for an empty query and nothing for no match", () => {
    expect(search("")).toEqual(all);
    expect(search("   ")).toHaveLength(all.length);
    expect(search("zzzzqqq")).toEqual([]);
  });
});
