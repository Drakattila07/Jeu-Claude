/**
 * Partie automatique.
 *
 * Les tests unitaires prouvent que le monde est cousu correctement ; celui-ci
 * vérifie qu'on peut réellement y marcher. Un automate tient une direction
 * pendant plusieurs secondes, change de cap, frappe, esquive — et l'on
 * surveille deux choses : le personnage progresse-t-il encore, et se
 * retrouve-t-il jamais encastré dans le décor ?
 *
 *   npx tsx tools/playtest.ts [secondes]
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { WORLD_ZONES } from "../src/data/world";

const port = 4175;
const url = `http://127.0.0.1:${port}/`;
const seconds = Number.parseInt(process.argv[2] ?? "180", 10);
const steps = Math.max(1, Math.round(seconds / 3));

/** Les cinquante-six régions, dans l'ordre de la grille. */
const ZONES: readonly (readonly [number, number])[] = WORLD_ZONES
  .map((zone) => [zone.x, zone.y] as const);

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Le serveur démarre encore.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error("Le serveur Vite n'a pas démarré.");
}

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(command, ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(), stdio: "ignore", shell: process.platform === "win32",
});

interface Report {
  frames: number;
  zonesVisited: string[];
  stuckEvents: string[];
  frozenEvents: string[];
  deaths: number;
  finalHearts: number;
  rupees: number;
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Le transpileur de `tsx` conserve les noms de fonctions via un utilitaire
  // `__name` qui n'existe pas dans la page : on le fournit avant tout script.
  await page.addInitScript(() => {
    (window as unknown as { __name: (value: unknown) => unknown }).__name = (value) => value;
  });
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(url, { waitUntil: "networkidle" });

  const report: Report = await page.evaluate(async (options) => {
    const count = options.steps;
    const game = window.__RACINES_GAME__!;
    game.stop();
    game.debugSkipTitle();

    const zones = new Set<string>();
    const stuck: string[] = [];
    const frozen: string[] = [];
    let frames = 0;
    let deaths = 0;
    let lastHearts = game.debugState().hearts;

    // On pilote le vrai gestionnaire d'entrées : c'est le même chemin de code
    // qu'un joueur au clavier.
    const press = (code: string, down: boolean): void => {
      window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code }));
    };

    const directions: readonly string[] = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    // Générateur reproductible : parcourir les quatre points cardinaux dans
    // l'ordre ramenait l'automate à son point de départ à chaque tour, et il
    // ne quittait jamais la première région.
    let rng = 0x1234567;
    const nextDirection = (): number => {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
      return rng % directions.length;
    };

    for (let step = 0; step < count; step += 1) {
      // On visite chaque région tour à tour : c'est la seule façon de vérifier
      // les cinquante-six en un temps raisonnable. L'automate n'y sait pas
      // chercher les passages, mais il sait dire s'il peut y bouger.
      const zone = options.zones[step % options.zones.length]!;
      game.debugGoto(zone[0], zone[1], step % 3 === 0 ? 22 : 10);
      const lead = nextDirection();
      // Marcher dans un mur n'est pas un bug : on ne signale un blocage que si
      // AUCUNE des quatre directions ne produit de déplacement. C'est la
      // définition d'un personnage réellement prisonnier.
      let progressed = false;
      let busyFrames = 0;
      for (let attempt = 0; attempt < directions.length && !progressed; attempt += 1) {
        const code = directions[(lead + attempt) % directions.length]!;
        press(code, true);
        const before = game.debugState();
        for (let frame = 0; frame < 60; frame += 1) {
          if (frame % 23 === 0) press("Space", true);
          if (frame % 23 === 3) press("Space", false);
          if (frame % 41 === 0) press("ShiftLeft", true);
          if (frame % 41 === 4) press("ShiftLeft", false);
          game.debugAdvance(1);
          frames += 1;
          const state = game.debugState();
          zones.add(`${state.zone.x},${state.zone.y}`);
          if (state.inSolid) {
            stuck.push(`zone ${state.zone.x},${state.zone.y} en ${state.x},${state.y}`);
          }
          if (state.hearts <= 0 && lastHearts > 0) deaths += 1;
          lastHearts = state.hearts;
          // Écran de mort, dialogue, boutique : on valide pour reprendre la main.
          if (state.busy) {
            busyFrames += 1;
            press("KeyX", true);
            game.debugAdvance(1);
            press("KeyX", false);
          }
        }
        const after = game.debugState();
        const delta = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
        if (delta > 6 || after.zone.x !== before.zone.x || after.zone.y !== before.zone.y) {
          progressed = true;
          // Un cap qui donne se tient : sinon l'automate piétine sur place et
          // ne franchit jamais une frontière.
          for (let frame = 0; frame < 240; frame += 1) {
            game.debugAdvance(1);
            frames += 1;
            const state = game.debugState();
            zones.add(`${state.zone.x},${state.zone.y}`);
            if (state.inSolid) {
              stuck.push(`zone ${state.zone.x},${state.zone.y} en ${state.x},${state.y}`);
            }
            if (state.hearts <= 0 && lastHearts > 0) deaths += 1;
            lastHearts = state.hearts;
            if (state.busy) {
              press("KeyX", true);
              game.debugAdvance(1);
              press("KeyX", false);
            }
          }
        }
        press(code, false);
      }
      if (!progressed && busyFrames < 120) {
        const state = game.debugState();
        frozen.push(`zone ${state.zone.x},${state.zone.y} en ${state.x},${state.y}`);
      }
    }

    const final = game.debugState();
    return {
      frames,
      zonesVisited: [...zones],
      stuckEvents: [...new Set(stuck)].slice(0, 20),
      frozenEvents: frozen.slice(0, 20),
      deaths,
      finalHearts: final.hearts,
      rupees: final.rupees,
    };
  }, { steps, zones: ZONES });

  const shotDir = path.resolve(process.cwd(), "screenshots");
  await mkdir(shotDir, { recursive: true });
  const dataUrl = await page.evaluate(() =>
    document.querySelector<HTMLCanvasElement>("#game")?.toDataURL("image/png") ?? "");
  if (dataUrl) {
    await writeFile(path.join(shotDir, "playtest-final.png"),
      Buffer.from(dataUrl.split(",")[1]!, "base64"));
  }
  await browser.close();

  console.log(`Images simulées      : ${report.frames}`);
  console.log(`Régions traversées   : ${report.zonesVisited.length}`);
  console.log(`Morts                : ${report.deaths}`);
  console.log(`Cœurs / rubis finaux : ${report.finalHearts} / ${report.rupees}`);
  console.log(`Encastrements        : ${report.stuckEvents.length}`);
  for (const event of report.stuckEvents) console.log(`   ✗ ${event}`);
  console.log(`Blocages             : ${report.frozenEvents.length}`);
  for (const event of report.frozenEvents) console.log(`   ✗ ${event}`);
  if (consoleErrors.length > 0) {
    console.log(`Erreurs console      : ${consoleErrors.length}`);
    for (const error of [...new Set(consoleErrors)].slice(0, 10)) console.log(`   ✗ ${error}`);
  }
  const failed = report.stuckEvents.length > 0 || report.frozenEvents.length > 0
    || consoleErrors.length > 0;
  console.log(failed ? "✗ Partie automatique en échec" : "✓ Partie automatique sans incident");
  if (failed) process.exitCode = 1;
} finally {
  server.kill();
}
