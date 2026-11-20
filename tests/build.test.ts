import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import pkg from "../package.json" with { type: "json" };
import { build, byDisplayName } from "../scripts/build.ts";
import { validate } from "../scripts/validate.ts";
import hashes from "../sources/hashes.json" with { type: "json" };

const out = mkdtempSync(join(tmpdir(), "kbi-build-"));
afterAll(() => rmSync(out, { recursive: true, force: true }));

const now = new Date("2026-11-20T00:00:00Z");
build(out, now);
const raw = (p: string) => readFileSync(join(out, p), "utf8");
const json = (p: string) => JSON.parse(raw(p));

describe("build output", () => {
  const all = json("v1/all.json");
  const banks = json("v1/banks.json");
  const ewallets = json("v1/ewallets.json");
  const bprs = json("v1/bprs.json");

  it("keeps the published /v1 paths stable", () => {
    expect(readdirSync(out).sort()).toEqual(["index.html", "v1"]);
    expect(readdirSync(join(out, "v1")).sort()).toEqual([
      "all.json",
      "banks.json",
      "bprs.json",
      "by-id",
      "ewallets.json",
      "meta.json",
    ]);
  });

  it("wraps lists in a versioned envelope", () => {
    for (const env of [all, banks, ewallets]) {
      expect(Object.keys(env)).toEqual(["version", "generated_at", "count", "data"]);
      expect(env.version).toBe(pkg.version);
      expect(env.generated_at).toBe("2026-11-20T00:00:00.000Z");
      expect(env.count).toBe(env.data.length);
    }
    expect(all.count).toBe(banks.count + ewallets.count);
    expect(Object.keys(bprs)).toEqual(Object.keys(all));
  });

  it("produces data that still validates", () => {
    expect(validate(banks.data, ewallets.data, bprs.data)).toEqual([]);
  });

  it("keeps BPR/BPRS out of all.json and banks.json", () => {
    expect(bprs.count).toBeGreaterThan(1000);
    expect(bprs.data.every((r: { category: string }) => r.category === "bpr" || r.category === "bprs")).toBe(
      true,
    );
    expect(all.data.some((r: { category: string }) => r.category === "bpr")).toBe(false);
    expect(json("v1/meta.json").counts.bprs).toBe(bprs.count);
  });

  it("sorts by display_name, stably", () => {
    expect([...all.data].sort(byDisplayName)).toEqual(all.data);
    expect(banks.data).toEqual(all.data.filter((r: { type: string }) => r.type === "bank"));
  });

  it("writes one by-id file per record, BPR/BPRS included", () => {
    expect(readdirSync(join(out, "v1/by-id"))).toHaveLength(all.count + bprs.count);
    expect(json("v1/by-id/bca.json")).toEqual(all.data.find((r: { id: string }) => r.id === "bca"));
  });

  it("minifies JSON", () => expect(raw("v1/all.json")).not.toContain("\n"));

  it("reports counts and source hashes in meta.json", () => {
    const meta = json("v1/meta.json");
    expect(meta.counts.all).toBe(all.count);
    expect(meta.counts.verified).toBe(all.data.filter((r: { verified: boolean }) => r.verified).length);
    expect(meta.sources).toEqual(hashes);
  });

  it("links every list endpoint from index.html", () => {
    for (const p of ["v1/all.json", "v1/banks.json", "v1/ewallets.json", "v1/bprs.json", "v1/meta.json"]) {
      expect(raw("index.html")).toContain(`href="${p}"`);
    }
  });
});

describe("byDisplayName", () => {
  const r = (id: string, display_name: string) => ({ id, display_name, type: "bank", verified: true });
  it("ignores case and breaks ties by id", () => {
    const sorted = [r("b", "bank x"), r("a", "Bank X"), r("c", "Allo")].sort(byDisplayName);
    expect(sorted.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});
