import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PALETTE_COLORS } from "../src/data/palette";
import { NPCS } from "../src/data/npcs/core";
import { QUESTS } from "../src/data/quests/core";
import { WORLD_ZONES } from "../src/data/world";
import { INTERACTABLES } from "../src/data/interactables";
import { ENEMY_SPAWNS } from "../src/data/enemies";

async function jsonFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(fullPath);
    return entry.name.endsWith(".json") ? [fullPath] : [];
  }));
  return nested.flat();
}

function unique(values: readonly string[], label: string, errors: string[]): void {
  if (new Set(values).size !== values.length) errors.push(`${label}: identifiants dupliqués.`);
}

const errors: string[] = [];
if (PALETTE_COLORS.length > 32) errors.push(`Palette: ${PALETTE_COLORS.length} couleurs au lieu de 32 maximum.`);
unique(NPCS.map((npc) => npc.id), "PNJ", errors);
unique(QUESTS.map((quest) => quest.id), "Quêtes", errors);
unique(WORLD_ZONES.map((zone) => zone.id), "Zones", errors);
unique(INTERACTABLES.map((object) => object.id), "Interactables", errors);

const zoneIds = new Set(WORLD_ZONES.map((zone) => zone.id));
for (const object of INTERACTABLES) if (!zoneIds.has(object.zone)) errors.push(`Interactable ${object.id}: zone ${object.zone} inconnue.`);
for (const enemy of ENEMY_SPAWNS) if (!zoneIds.has(enemy.zone)) errors.push(`Ennemi ${enemy.id}: zone ${enemy.zone} inconnue.`);
for (const npc of NPCS) {
  if (npc.chatter.length < 4) errors.push(`PNJ ${npc.id}: moins de quatre bavardages.`);
  for (const schedule of npc.schedule) if (!zoneIds.has(schedule.zone)) errors.push(`PNJ ${npc.id}: zone ${schedule.zone} inconnue.`);
}

for (const file of await jsonFiles(path.resolve(process.cwd(), "src/data"))) {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (typeof parsed === "object" && parsed !== null && "layers" in parsed) {
      const map = parsed as { width?: number; height?: number; layers?: readonly { name?: string; data?: readonly number[] }[] };
      const expected = (map.width ?? 0) * (map.height ?? 0);
      if (map.layers?.length !== 4) errors.push(`${file}: la carte doit avoir quatre couches.`);
      for (const layer of map.layers ?? []) if (layer.data?.length !== expected) {
        errors.push(`${file}: couche ${layer.name ?? "?"} invalide.`);
      }
    }
  } catch (error) {
    errors.push(`${file}: JSON invalide (${error instanceof Error ? error.message : "erreur inconnue"}).`);
  }
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`✗ ${error}`));
  process.exitCode = 1;
} else {
  console.log(`✓ Données valides · ${PALETTE_COLORS.length}/32 couleurs · ${NPCS.length} PNJ · ${QUESTS.length} quêtes · ${WORLD_ZONES.length} zones déclarées`);
}
