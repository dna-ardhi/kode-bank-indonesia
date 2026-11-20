import { type Institution, search } from "../../../src/index.ts";

// search() drops punctuation and emoji, so a query made only of those becomes "" and returns every record.
export function matches(query: string): Institution[] {
  const q = query.trim();
  return q && !/[\p{L}\p{N}]/u.test(q) ? [] : search(query);
}

// Pickers offer only active institutions, capped to keep the list short.
export const pickable = (rows: Institution[], max = 8): Institution[] =>
  rows.filter((r) => r.status === "active").slice(0, max);
