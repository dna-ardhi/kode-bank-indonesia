// Data is the built API output (dist/v1/all.json), so the package and the URLs always agree.
// tests/types.test.ts fails when these types drift from schema/institution.schema.json.
import api from "../dist/v1/all.json" with { type: "json" };

export type InstitutionType = "bank" | "ewallet";
export type Category =
  | "commercial"
  | "sharia"
  | "sharia-unit"
  | "regional"
  | "foreign"
  | "digital"
  | "ewallet";
export type Status = "active" | "inactive";

export interface AccountNumber {
  kind: "account" | "phone";
  label: string;
  min_length?: number;
  max_length?: number;
  pattern?: string;
}

export interface Institution {
  /** Stable kebab-case slug. Never reused or renamed once published. */
  id: string;
  type: InstitutionType;
  category: Category;
  /** Legal name as BI lists it (or the operator name for e-wallets). */
  name: string;
  display_name: string;
  aliases: string[];
  /** Set for product brands and sharia units that route through a parent bank. */
  parent_id: string | null;
  /** 3-digit sandi bank, leading zeros kept. null if unknown. */
  bank_code: string | null;
  /** BIC from the BI-FAST list. */
  bic: string | null;
  /** Only present when SKNBI uses a different BIC than `bic`. */
  sknbi_bic?: string;
  bi_fast: boolean;
  sknbi: boolean;
  account_number: AccountNumber;
  logo: string | null;
  status: Status;
  merged_into: string | null;
  sources: string[];
  /** false if any field is not confirmed against an official source. */
  verified: boolean;
  /** YYYY-MM-DD */
  updated_at: string;
}

// build.ts validated the data against the schema, so the cast is safe.
/** Every record (banks, brands, sharia units, e-wallets), sorted by display_name. */
export const all: readonly Institution[] = api.data as Institution[];
export const banks: readonly Institution[] = all.filter((r) => r.type === "bank");
export const ewallets: readonly Institution[] = all.filter((r) => r.type === "ewallet");

const byId = new Map(all.map((r) => [r.id, r]));
export const findById = (id: string): Institution | undefined => byId.get(id);

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const index = all.map((r) => ({
  r,
  text: [r.display_name, ...r.aliases, r.name, r.id].map(norm),
  codes: [r.bank_code, r.bic, r.sknbi_bic].flatMap((c) => (c ? [c.toLowerCase()] : [])),
}));

/**
 * Case-, punctuation- and accent-insensitive search over display_name, aliases, name and id, plus
 * exact bank_code / BIC. Exact matches first, then prefix, then substring. Empty query returns all.
 * Inactive records are included; filter on `status` for pickers.
 */
export function search(query: string): Institution[] {
  const q = norm(String(query ?? ""));
  if (!q) return [...all];
  const hits: { r: Institution; rank: number }[] = [];
  for (const { r, text, codes } of index) {
    let rank = codes.includes(q) ? 0 : 3;
    for (const t of text) rank = Math.min(rank, t === q ? 0 : t.startsWith(q) ? 1 : t.includes(q) ? 2 : 3);
    if (rank < 3) hits.push({ r, rank });
  }
  // Array sort is stable, so equal ranks keep the display_name order of `all`.
  return hits.sort((a, b) => a.rank - b.rank).map((h) => h.r);
}
