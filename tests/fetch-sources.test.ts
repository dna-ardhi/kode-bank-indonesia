import { describe, expect, it } from "vitest";
import { assertPdf, compare, sha256 } from "../scripts/sync/fetch-sources.ts";

const enc = (s: string) => new TextEncoder().encode(s);

describe("fetch-sources helpers", () => {
  it("accepts PDF bytes and rejects HTML error pages", () => {
    expect(() => assertPdf(enc("%PDF-1.7\n…"))).not.toThrow();
    expect(() => assertPdf(enc("<html>Request Rejected</html>"))).toThrow(/expected a PDF/);
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
