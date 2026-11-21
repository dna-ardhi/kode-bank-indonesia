import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import schema from "../schema/institution.schema.json" with { type: "json" };

type Rec = Record<string, unknown> & { id?: unknown };

const ajv = new Ajv2020({ allErrors: true });
const checkSchema = ajv.compile(schema);

/** Returns a list of human-readable errors; empty means valid. */
export function validate(banks: unknown, ewallets: unknown, bprs: unknown = []): string[] {
  const errors: string[] = [];
  const files: [string, string, unknown][] = [
    ["banks.json", "bank", banks],
    ["ewallets.json", "ewallet", ewallets],
    ["bprs.json", "bank", bprs],
  ];
  const all: Rec[] = [];

  for (const [file, type, data] of files) {
    if (!Array.isArray(data)) {
      errors.push(`${file}: must be a JSON array`);
      continue;
    }
    data.forEach((rec: Rec, i) => {
      const where = `${file}[${i}]${typeof rec?.id === "string" ? ` (${rec.id})` : ""}`;
      if (!checkSchema(rec)) {
        for (const e of checkSchema.errors ?? []) {
          errors.push(`${where}: ${e.instancePath || "/"} ${e.message}`);
        }
        return; // cross-record checks assume a schema-valid record
      }
      if (rec.type !== type) errors.push(`${where}: type must be "${type}" in ${file}`);
      if (rec.merged_into !== null && rec.status !== "inactive") {
        errors.push(`${where}: merged_into is set, so status must be "inactive"`);
      }
      // The checkable half of the verified rule (AGENTS.md). Banks: name and BIC from BI-FAST, a
      // confirmed code. E-wallets have no sandi bank: a licence checked on BI's register (bi-pjp), the
      // operator named by ASPI, no unconfirmed code, and a BIC only when BI-FAST lists it.
      if (rec.verified) {
        const src = rec.sources as string[];
        const ewallet = rec.type === "ewallet";
        const ok = ewallet
          ? rec.bank_code === null &&
            src.includes("bi-pjp") &&
            src.includes("aspi-qris") &&
            (rec.bic === null || rec.bi_fast === true)
          : rec.bank_code !== null && rec.bic !== null && rec.bi_fast === true;
        if (!ok)
          errors.push(
            `${where}: verified needs ${ewallet ? "bi-pjp and aspi-qris in sources and no bank_code" : "a bank_code, a bic and bi_fast: true"}`,
          );
      }
      const an = rec.account_number as { min_length?: number; max_length?: number };
      if (an.min_length !== undefined && an.max_length !== undefined && an.min_length > an.max_length) {
        errors.push(`${where}: account_number.min_length > max_length`);
      }
      all.push(rec);
    });
  }

  const ids = new Set<unknown>();
  for (const r of all) {
    if (ids.has(r.id)) errors.push(`duplicate id "${r.id}"`);
    ids.add(r.id);
  }

  const dupes = (field: string, pick: (r: Rec) => boolean) => {
    const seen = new Map<unknown, unknown>();
    for (const r of all) {
      const v = r[field];
      if (v === null || v === undefined || !pick(r)) continue;
      if (seen.has(v)) errors.push(`duplicate ${field} "${v}" on "${seen.get(v)}" and "${r.id}"`);
      else seen.set(v, r.id);
    }
  };
  // bic and sknbi_bic share one namespace: a BIC identifies exactly one record.
  const bics = new Map<unknown, unknown>();
  for (const r of all) {
    for (const v of [r.bic, r.sknbi_bic]) {
      if (v === null || v === undefined) continue;
      if (bics.has(v)) errors.push(`duplicate bic "${v}" on "${bics.get(v)}" and "${r.id}"`);
      else bics.set(v, r.id);
    }
    if (r.sknbi_bic !== undefined && r.sknbi !== true)
      errors.push(`"${r.id}": sknbi_bic is set, so sknbi must be true`);
  }
  // Brands (parent_id set) may share their parent's code; inactive records keep historical codes.
  dupes("bank_code", (r) => r.status === "active" && r.parent_id === null);
  dupes("ojk_code", () => true);

  for (const r of all) {
    for (const field of ["parent_id", "merged_into"]) {
      const ref = r[field];
      if (ref === null) continue;
      if (ref === r.id) errors.push(`"${r.id}": ${field} points to itself`);
      else if (!ids.has(ref)) errors.push(`"${r.id}": ${field} "${ref}" does not exist`);
    }
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = (f: string) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
  const banks = read("banks.json");
  const ewallets = read("ewallets.json");
  const bprs = read("bprs.json");
  const errors = validate(banks, ewallets, bprs);
  if (errors.length) {
    console.error(`✗ ${errors.length} error(s):\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`✓ ${banks.length} banks, ${ewallets.length} e-wallets, ${bprs.length} BPR/BPRS valid`);
}
