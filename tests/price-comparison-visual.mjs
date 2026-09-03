import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = await build({
  configFile: false, root, plugins: [react()],
  resolve: { alias: { "@": path.join(root, "src") } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { write: false, minify: false, lib: { entry: path.join(root, "tests/price-comparison.fixture.tsx"), formats: ["iife"], name: "PriceComparisonFixture" } },
});
const output = (Array.isArray(bundle) ? bundle[0] : bundle).output;
const code = output.filter((item) => item.type === "chunk").map((item) => item.code).join("\n");
const css = output.filter((item) => item.type === "asset" && item.fileName.endsWith(".css")).map((item) => String(item.source)).join("\n");
await fs.mkdir(path.join(root, ".logs"), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 390]) {
    for (const theme of ["dark", "light"]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body><div id="root"></div></body></html>`);
      await page.addScriptTag({ content: code });
      await page.waitForFunction(() => document.querySelectorAll(".recharts-line-curve").length === 6);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "page must not overflow horizontally");
      await page.screenshot({ path: path.join(root, `.logs/price-comparison-${width}-${theme}.png`), fullPage: true });
      await page.getByRole("checkbox", { name: "ETH", exact: true }).uncheck();
      assert.equal(await page.locator(".recharts-line-curve").count(), 5);
      await page.getByRole("button", { name: "原始價格", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "原始價格", exact: true }).getAttribute("aria-pressed"), "true");
      assert.deepEqual(errors, []);
      await page.close();
    }
  }
  console.log("Price comparison: desktop/mobile, light/dark, six visible series, visibility toggle, price mode passed.");
} finally {
  await browser.close();
}
