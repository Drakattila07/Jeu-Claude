import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4173;
const url = `http://127.0.0.1:${port}/`;
const frames = Number.parseInt(process.argv[2] ?? "180", 10);
const output = path.resolve(process.cwd(), "screenshots", `frame-${frames}.png`);

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Le serveur est encore en train de démarrer.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Le serveur Vite n'a pas démarré.");
}

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(command, ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  stdio: "ignore",
  shell: process.platform === "win32",
});

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate((count) => {
    const game = window.__RACINES_GAME__;
    game?.stop();
    game?.debugAdvance(count);
  }, frames);
  await mkdir(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, fullPage: true });
  await browser.close();
  console.log(`✓ Capture enregistrée : ${output}`);
} finally {
  server.kill();
}
