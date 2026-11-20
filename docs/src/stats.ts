// Numbers shown in the docs come from the same data as the API, so they can't go stale.
import bprsApi from "../../dist/v1/bprs.json" with { type: "json" };
import { all } from "../../src/index.ts";

export const stats = {
  total: all.length,
  bprs: bprsApi.count,
  banks: all.filter((r) => r.type === "bank").length,
  ewallets: all.filter((r) => r.type === "ewallet").length,
  verified: all.filter((r) => r.verified).length,
  unverified: all.filter((r) => !r.verified).length,
  withCode: all.filter((r) => r.bank_code).length,
  withoutCode: all.filter((r) => !r.bank_code).length,
};
