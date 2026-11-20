import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseIndonesianDate } from "../scripts/lib/pdf-table.ts";
import { parseBifast } from "../scripts/sync/parse-bifast.ts";
import { parseSknbi } from "../scripts/sync/parse-sknbi.ts";

const fixture = (f: string) => readFileSync(new URL(`fixtures/${f}`, import.meta.url));
const bifastPdf = fixture("bi-fast-2026-09-24.pdf");
const sknbiPdf = fixture("sknbi-2026-09-24.pdf");

describe("parseBifast (Per 24 Sept 2026)", async () => {
  const { as_of, rows } = await parseBifast(bifastPdf);
  const byBic = (bic: string) => rows.find((r) => r.bic === bic);

  // Counted by hand from the PDF; a layout change must fail here, not silently return fewer rows.
  it("returns every participant", () => expect(rows).toHaveLength(127));
  it("reads the edition date", () => expect(as_of).toBe("2026-09-24"));

  it("pairs BIC, name and services", () => {
    expect(rows[0]).toEqual({ bic: "ABALIDBS", name: "PT. BPD BALI", services: ["credit-transfer"] });
    expect(rows.at(-1)).toEqual({
      bic: "YUDBIDJ1",
      name: "PT. BANK NEO COMMERCE",
      services: ["credit-transfer"],
    });
    expect(byBic("CENAIDJA")).toEqual({
      bic: "CENAIDJA",
      name: "PT. BANK CENTRAL ASIA Tbk.",
      services: ["credit-transfer", "bulk-credit-transfer"],
    });
    expect(byBic("BMRIIDJA")?.services).toEqual(["credit-transfer", "credit-transfer-rfp", "direct-debit"]);
    expect(byBic("MEGAIDJA")?.services).toEqual(["credit-transfer", "bulk-credit-transfer"]); // page 2
  });

  it("matches the total checkmark count in the PDF", () => {
    expect(rows.reduce((n, r) => n + r.services.length, 0)).toBe(155);
  });

  it("includes non-bank participants (e-wallet operators)", () => {
    expect(byBic("APIDIDJ1")?.name).toBe("PT AIRPAY INTERNATIONAL");
    expect(byBic("DANAIDJ1")?.name).toBe("PT. ESPAY DEBIT INDONESIA KOE");
  });
});

describe("parseSknbi (Per 24 Sept 2026)", async () => {
  const { as_of, rows } = await parseSknbi(sknbiPdf);

  it("returns every participant", () => expect(rows).toHaveLength(125));
  it("reads the edition date", () => expect(as_of).toBe("2026-09-24"));
  it("matches the total checkmark count in the PDF", () => {
    expect(rows.reduce((n, r) => n + r.services.length, 0)).toBe(498);
  });

  // Documents the known defect in this edition (see parse-sknbi.ts). If BI fixes the file, this
  // fails on the next fixture update, which is the cue to start trusting SKNBI names again.
  it("has names misaligned with BICs in this edition", () => {
    expect(rows.find((r) => r.bic === "CENAIDJA")?.name).toBe("PT. BANK MEGA SYARIAH");
  });
});

describe("parser strictness", () => {
  it("rejects a PDF with a different layout", async () => {
    await expect(parseBifast(sknbiPdf)).rejects.toThrow(/header "Individual Credit"/);
  });
  it("rejects non-PDF input", async () => {
    await expect(parseBifast(new TextEncoder().encode("<html>Request Rejected</html>"))).rejects.toThrow();
  });
});

describe("parseIndonesianDate", () => {
  it.each([
    ["24 Sept 2026", "2026-09-24"],
    ["1 Agustus 2026", "2026-08-01"],
    ["5 Mei 2026", "2026-05-05"],
    ["31 Des. 2026", "2026-12-31"],
  ])("%s -> %s", (input, iso) => expect(parseIndonesianDate(input)).toBe(iso));
  it("throws on unknown formats", () => expect(() => parseIndonesianDate("2026-09-24")).toThrow());
});
