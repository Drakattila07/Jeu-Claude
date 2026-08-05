/**
 * Planche de contrôle graphique.
 *
 * Juger une passe artistique une capture à la fois est intenable : cet outil
 * traverse une sélection de régions, y avance quelques secondes de simulation
 * et enregistre le canvas seul, sans l'habillage de la page.
 *
 *   npx tsx tools/gallery.ts            → la sélection par défaut
 *   npx tsx tools/gallery.ts 3,3 0,0    → des régions précises
 *   npx tsx tools/gallery.ts --nuit     → la même sélection à 22 h
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4174;
const url = `http://127.0.0.1:${port}/`;

const args = process.argv.slice(2);
const night = args.includes("--nuit");
const hour = night ? 22 : 10;
const zoneArgs = args.filter((value) => /^\d+,\d+$/.test(value));

/** Une région par ambiance : de quoi juger l'ensemble d'un coup d'œil. */
const DEFAULT_ZONES: readonly (readonly [number, number, string])[] = [
  [3, 3, "village-place-puits"],
  [2, 3, "village-hameau-nord"],
  [2, 2, "foret-carrefour"],
  [1, 1, "foret-sentier"],
  [0, 0, "cimes"],
  [7, 1, "falaises"],
  [6, 2, "ruines"],
  [5, 2, "chateau"],
  [0, 2, "tour-de-lune"],
  [1, 3, "marais"],
  [4, 2, "riviere"],
  [3, 4, "quai-du-lac"],
  [2, 5, "lac-profond"],
  [5, 3, "champs"],
  [7, 5, "canal"],
  [7, 0, "arene"],
  [9, 6, "port-maree"],
  [8, 6, "greve-de-maree"],
  [8, 7, "rade"],
  [1, 7, "ile-des-os"],
  [5, 7, "ile-du-phare"],
  [3, 8, "haute-mer"],
  [8, 8, "ile-du-volcan"],
  [9, 8, "caldeira"],
  [8, 2, "vertepierre"],
];

const zones = zoneArgs.length > 0
  ? zoneArgs.map((value) => {
    const [x, y] = value.split(",").map(Number);
    return [x!, y!, `zone-${x}-${y}`] as const;
  })
  : DEFAULT_ZONES;

const outputDir = path.resolve(process.cwd(), "screenshots", night ? "galerie-nuit" : "galerie");

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Le serveur est encore en train de démarrer.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error("Le serveur Vite n'a pas démarré.");
}

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(command, ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(), stdio: "ignore", shell: process.platform === "win32",
});

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await mkdir(outputDir, { recursive: true });
  // On photographie l'élément affiché, agrandi par le CSS : à 384×216 natif,
  // impossible de juger un détail d'un pixel.
  const canvas = page.locator("#game");

  await page.evaluate(() => window.__RACINES_GAME__?.stop());

  // Écrans d'interface : ils comptent autant que le décor.
  await page.evaluate(() => window.__RACINES_GAME__?.debugAdvance(40));
  await canvas.screenshot({ path: path.join(outputDir, "ui-titre.png") });
  for (const [key, label] of [["Enter", "sac"], ["KeyM", "carte"]] as const) {
    await page.evaluate((code) => {
      const game = window.__RACINES_GAME__;
      game?.debugSkipTitle();
      game?.debugAdvance(4);
      window.dispatchEvent(new KeyboardEvent("keydown", { code }));
      game?.debugAdvance(2);
      window.dispatchEvent(new KeyboardEvent("keyup", { code }));
      game?.debugAdvance(6);
    }, key);
    await canvas.screenshot({ path: path.join(outputDir, `ui-${label}.png`) });
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter" }));
      window.__RACINES_GAME__?.debugAdvance(2);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "Enter" }));
      window.__RACINES_GAME__?.debugAdvance(4);
    });
  }
  console.log("✓ écrans d'interface");

  for (const [zoneX, zoneY, label] of zones) {
    await page.evaluate(({ x, y, at }) => {
      const game = window.__RACINES_GAME__;
      game?.debugGoto(x, y, at);
      game?.debugAdvance(90);
    }, { x: zoneX, y: zoneY, at: hour });
    await canvas.screenshot({ path: path.join(outputDir, `${label}.png`) });
    console.log(`✓ ${label}`);
  }

  for (const kind of ["cottage", "tower", "castle", "hermitage"] as const) {
    await page.evaluate((room) => {
      const game = window.__RACINES_GAME__;
      game?.debugEnterInterior(room);
      game?.debugAdvance(60);
    }, kind);
    await canvas.screenshot({ path: path.join(outputDir, `interieur-${kind}.png`) });
    console.log(`✓ intérieur ${kind}`);
  }

  await browser.close();
  console.log(`✓ Planche enregistrée dans ${outputDir}`);
} finally {
  server.kill();
}
