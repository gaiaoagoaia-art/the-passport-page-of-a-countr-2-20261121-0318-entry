// main.ts — entrypoint. Writes the invented passport spread to entry.png.
// Node 22 stdlib only; no network, no external assets. Deterministic output.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "./draw.ts";

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
const png = render();
writeFileSync(join(outDir, "entry.png"), png);
console.log(`wrote ${join(outDir, "entry.png")} (${png.length} bytes)`);
