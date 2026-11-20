import { describe, expect, it } from "vitest";
import { validate } from "../scripts/validate.ts";

const bank = (over: Record<string, unknown> = {}) => ({
  id: "bca",
  type: "bank",
  category: "commercial",
  name: "PT Bank Central Asia Tbk",
  display_name: "BCA",
  aliases: [],
  parent_id: null,
  bank_code: "014",
  bic: "CENAIDJA",
  bi_fast: true,
  sknbi: true,
  account_number: { kind: "account", label: "Nomor rekening" },
  logo: null,
  status: "active",
  merged_into: null,
  sources: ["bi-fast"],
  verified: true,
  updated_at: "2026-11-20",
  ...over,
});

const ewallet = (over: Record<string, unknown> = {}) =>
  bank({
    id: "gopay",
    type: "ewallet",
    category: "ewallet",
    bank_code: null,
    bic: null,
    account_number: { kind: "phone", label: "Nomor HP" },
    ...over,
  });

const errs = (banks: unknown[], ewallets: unknown[] = []) => validate(banks, ewallets);

describe("validate", () => {
  it("accepts empty data", () => expect(errs([])).toEqual([]));

  it("accepts a valid bank, brand and e-wallet", () => {
    const brand = bank({ id: "jenius", parent_id: "bca", bic: null, category: "digital" });
    expect(errs([bank(), brand], [ewallet()])).toEqual([]);
  });

  it("rejects non-array files", () =>
    expect(errs({} as never)).toEqual(["banks.json: must be a JSON array"]));

  it.each([
    ["non-kebab id", { id: "Bank_BCA" }],
    ["unknown field", { extra: 1 }],
    ["2-digit bank_code", { bank_code: "14" }],
    ["lowercase bic", { bic: "cenaidja" }],
    ["bad date", { updated_at: "20-11-2026" }],
    ["ewallet category on a bank", { category: "ewallet" }],
  ])("rejects %s", (_, over) => {
    expect(errs([bank(over)])).not.toEqual([]);
  });

  it("rejects a bank category on an e-wallet", () => {
    expect(errs([], [ewallet({ category: "commercial" })])).not.toEqual([]);
  });

  it("rejects wrong type for the file", () => {
    expect(errs([ewallet()])).toEqual(['banks.json[0] (gopay): type must be "bank" in banks.json']);
  });

  it("rejects duplicate ids across files", () => {
    expect(errs([bank()], [ewallet({ id: "bca" })])).toContain('duplicate id "bca"');
  });

  it("rejects duplicate bic", () => {
    const e = errs([bank(), bank({ id: "bca-2", bank_code: "999" })]);
    expect(e).toEqual(['duplicate bic "CENAIDJA" on "bca" and "bca-2"']);
  });

  it("treats sknbi_bic as part of the BIC namespace", () => {
    expect(errs([bank({ sknbi_bic: "CENAIDBB" })])).toEqual([]);
    const clash = bank({ id: "other", bank_code: "999", bic: null, sknbi_bic: "CENAIDJA" });
    expect(errs([bank(), clash])).toEqual(['duplicate bic "CENAIDJA" on "bca" and "other"']);
    expect(errs([bank({ sknbi: false, sknbi_bic: "CENAIDBB" })])).toEqual([
      '"bca": sknbi_bic is set, so sknbi must be true',
    ]);
  });

  it("rejects duplicate bank_code among active non-brands", () => {
    const e = errs([bank(), bank({ id: "other", bic: null })]);
    expect(e).toEqual(['duplicate bank_code "014" on "bca" and "other"']);
  });

  it("allows shared bank_code for brands and inactive records", () => {
    const brand = bank({ id: "brand", parent_id: "bca", bic: null });
    const old = bank({ id: "old", bic: null, status: "inactive", merged_into: "bca" });
    expect(errs([bank(), brand, old])).toEqual([]);
  });

  it("rejects dangling and self references", () => {
    expect(errs([bank({ parent_id: "nope" })])).toEqual(['"bca": parent_id "nope" does not exist']);
    expect(errs([bank({ status: "inactive", merged_into: "bca" })])).toEqual([
      '"bca": merged_into points to itself',
    ]);
  });

  it("requires inactive status when merged_into is set", () => {
    const e = errs([bank(), bank({ id: "old", bic: null, bank_code: null, merged_into: "bca" })]);
    expect(e).toEqual(['banks.json[1] (old): merged_into is set, so status must be "inactive"']);
  });

  it("rejects min_length > max_length", () => {
    const an = { kind: "account", label: "x", min_length: 12, max_length: 10 };
    expect(errs([bank({ account_number: an })])).toEqual([
      "banks.json[0] (bca): account_number.min_length > max_length",
    ]);
  });

  describe("BPR / BPRS records", () => {
    const bpr = (over: Record<string, unknown> = {}) =>
      bank({
        id: "bpr-600001",
        category: "bpr",
        bank_code: null,
        bic: null,
        ojk_code: "600001",
        bi_fast: false,
        sknbi: false,
        verified: false,
        ...over,
      });
    it("accepts a BPR with an OJK code and no transfer code", () => {
      expect(validate([], [], [bpr()])).toEqual([]);
    });
    it("rejects a malformed or duplicated OJK code", () => {
      expect(validate([], [], [bpr({ ojk_code: "6001" })]).join()).toMatch(/ojk_code/);
      expect(validate([], [], [bpr(), bpr({ id: "bpr-600002" })]).join()).toMatch(
        /duplicate ojk_code "600001"/,
      );
    });
    it("does not treat records without an OJK code as duplicates of each other", () => {
      expect(validate([bank(), bank({ id: "bni", bank_code: "009", bic: "BNINIDJA" })], [])).toEqual([]);
    });
  });
});
