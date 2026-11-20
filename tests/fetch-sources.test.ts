import { describe, expect, it } from "vitest";
import { assertPdf, assertXlsx, compare, findLink, sha256 } from "../scripts/sync/fetch-sources.ts";

const enc = (s: string) => new TextEncoder().encode(s);

describe("fetch-sources helpers", () => {
  it("accepts PDF bytes and rejects HTML error pages", () => {
    expect(() => assertPdf(enc("%PDF-1.7\n…"))).not.toThrow();
    expect(() => assertPdf(enc("<html>Request Rejected</html>"))).toThrow(/expected a PDF/);
  });

  it("accepts xlsx (zip) bytes and rejects HTML error pages", () => {
    expect(() => assertXlsx(new Uint8Array([0x50, 0x4b, 3, 4, 0]))).not.toThrow();
    expect(() => assertXlsx(enc("<html>Request Rejected</html>"))).toThrow(/expected an xlsx/);
  });

  it("finds the file link on a listing page", () => {
    const html = '<a href="/d/Daftar Alamat Bank Umum - Juni 2026.xlsx">x</a>';
    const link = /href="([^"]*Daftar[^"]*Bank[^"]*Umum[^"]*\.xlsx)"/i;
    expect(findLink(html, "https://ojk.go.id/p/a.aspx", link)).toBe(
      "https://ojk.go.id/d/Daftar%20Alamat%20Bank%20Umum%20-%20Juni%202026.xlsx",
    );
    expect(() => findLink("<html></html>", "https://ojk.go.id/p/a.aspx", link)).toThrow(/not found/);
  });

  it("classifies hashes", () => {
    const prev = { "bi-fast": { sha256: "abc", updated_at: "2026-11-20" } };
    expect(compare(prev, "bi-fast", "abc")).toBe("unchanged");
    expect(compare(prev, "bi-fast", "def")).toBe("changed");
    expect(compare(prev, "sknbi", "abc")).toBe("new");
  });

  it("hashes with SHA-256", () => {
    expect(sha256(enc("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
