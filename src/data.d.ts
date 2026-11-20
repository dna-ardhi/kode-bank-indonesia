// Used only by tsconfig.build.json, which turns off resolveJsonModule so tsc doesn't copy the 50 KB
// data file into lib/. The real file is shipped once, in dist/. (The dev tsconfig reads the JSON.)
declare module "*/dist/v1/all.json" {
  const api: { version: string; generated_at: string; count: number; data: unknown[] };
  export default api;
}
