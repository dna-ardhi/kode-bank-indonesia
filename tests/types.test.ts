// Keeps the types in src/index.ts in sync with the JSON Schema. The Record<...> literals fail `pnpm typecheck`
// when a TS key is missing or extra; the expects fail `pnpm test` when the schema changes.
import { describe, expect, it } from "vitest";
import schema from "../schema/institution.schema.json" with { type: "json" };
import type { AccountNumber, Category, Institution, InstitutionType, Status } from "../src/index.ts";

type RequiredKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? never : K }[keyof T];
const sorted = (o: object) => Object.keys(o).sort();

const institutionKeys: Record<keyof Institution, true> = {
  id: true,
  type: true,
  category: true,
  name: true,
  display_name: true,
  aliases: true,
  parent_id: true,
  bank_code: true,
  bic: true,
  sknbi_bic: true,
  bi_fast: true,
  sknbi: true,
  account_number: true,
  logo: true,
  status: true,
  merged_into: true,
  sources: true,
  verified: true,
  updated_at: true,
};
const { sknbi_bic: _optional, ...requiredInstitution } = institutionKeys;
const institutionRequired: Record<RequiredKeys<Institution>, true> = requiredInstitution;

const accountKeys: Record<keyof AccountNumber, true> = {
  kind: true,
  label: true,
  min_length: true,
  max_length: true,
  pattern: true,
};
const accountRequired: Record<RequiredKeys<AccountNumber>, true> = { kind: true, label: true };

const types: Record<InstitutionType, true> = { bank: true, ewallet: true };
const statuses: Record<Status, true> = { active: true, inactive: true };
const kinds: Record<AccountNumber["kind"], true> = { account: true, phone: true };
const categories: Record<Category, true> = {
  commercial: true,
  sharia: true,
  "sharia-unit": true,
  regional: true,
  foreign: true,
  digital: true,
  ewallet: true,
};

describe("index.d.ts matches the schema", () => {
  const p = schema.properties;
  it("has the same fields and required fields", () => {
    expect(sorted(institutionKeys)).toEqual(sorted(p));
    expect(sorted(institutionRequired)).toEqual([...schema.required].sort());
    expect(sorted(accountKeys)).toEqual(sorted(p.account_number.properties));
    expect(sorted(accountRequired)).toEqual([...p.account_number.required].sort());
  });

  it("has the same enum values", () => {
    expect(sorted(types)).toEqual([...p.type.enum].sort());
    expect(sorted(statuses)).toEqual([...p.status.enum].sort());
    expect(sorted(kinds)).toEqual([...p.account_number.properties.kind.enum].sort());
    expect(sorted(categories)).toEqual([...p.category.enum].sort());
  });
});
