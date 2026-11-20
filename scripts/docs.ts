// Builds dist/ (the API), copies dist/v1 into docs/public/v1 so the docs site serves the API too,
// then runs Astro. Usage: node scripts/docs.ts dev|build
import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { build } from "./build.ts";

const cmd = process.argv[2];
if (cmd !== "dev" && cmd !== "build") throw new Error("usage: docs.ts dev|build");

build("dist");
rmSync("docs/public/v1", { recursive: true, force: true });
cpSync("dist/v1", "docs/public/v1", { recursive: true });

const r = spawnSync("pnpm", ["exec", "astro", cmd, "--root", "docs"], { stdio: "inherit" });
process.exit(r.status ?? 1);
