import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PALETTE_COLORS } from "../src/data/palette";
import { NPCS } from "../src/data/npcs/core";
import { QUESTS } from "../src/data/quests/core";
import { WORLD_ZONES } from "../src/data/world";
import { INTERACTABLES } from "../src/data/interactables";
import { CASTLE_ENEMY_SPAWNS, ENEMY_SPAWNS } from "../src/data/enemies";
import { SIDE_ACTIVITIES } from "../src/data/sideActivities";
import { SHOP_STOCK } from "../src/data/shop";
import { ITEMS } from "../src/data/items/core";
import { createZoneMap } from "../src/world/ZoneMapFactory";
import { TileMap } from "../src/world/TileMap";
import { TileSet } from "../src/world/TileSet";
import { EDGES, gatewayFor, neighbourOf, oppositeEdge } from "../src/world/WorldGen";

const tileSet = new TileSet();

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
unique([...ENEMY_SPAWNS, ...CASTLE_ENEMY_SPAWNS].map((enemy) => enemy.id), "Ennemis", errors);

const zoneIds = new Set(WORLD_ZONES.map((zone) => zone.id));
for (const object of INTERACTABLES) if (!zoneIds.has(object.zone)) errors.push(`Interactable ${object.id}: zone ${object.zone} inconnue.`);
for (const enemy of ENEMY_SPAWNS) if (!zoneIds.has(enemy.zone)) errors.push(`Ennemi ${enemy.id}: zone ${enemy.zone} inconnue.`);
for (const npc of NPCS) {
  if (npc.chatter.length < 4) errors.push(`PNJ ${npc.id}: moins de quatre bavardages.`);
  for (const schedule of npc.schedule) if (!zoneIds.has(schedule.zone)) errors.push(`PNJ ${npc.id}: zone ${schedule.zone} inconnue.`);
}

// — Atteignabilité : une activité annexe dont le déclencheur n'existe nulle
// part rend sa quête impossible à terminer, en silence.
const CODE_TRIGGERS = new Set(["map_100", "merchant_debt"]);
const objectIds = new Set<string>(INTERACTABLES.map((object) => object.id));
const shopTriggers = new Set(SHOP_STOCK.flatMap((entry) => entry.trigger ? [entry.trigger] : []));
for (const activity of SIDE_ACTIVITIES) {
  if (!objectIds.has(activity.trigger) && !shopTriggers.has(activity.trigger)
    && !CODE_TRIGGERS.has(activity.trigger)) {
    errors.push(`Activité ${activity.id}: déclencheur « ${activity.trigger} » absent du monde.`);
  }
  const quest = QUESTS.find((candidate) => candidate.id === activity.quest);
  if (!quest) {
    errors.push(`Activité ${activity.id}: quête ${activity.quest} inconnue.`);
    continue;
  }
  const step = quest.steps.find((candidate) => candidate.target === activity.event.target);
  if (step && activity.event.type === "collect") {
    const granted = activity.event.amount ?? 1;
    const needed = "count" in step ? step.count : 1;
    if (granted < needed) {
      errors.push(`Activité ${activity.id}: accorde ${granted} pour ${needed} requis.`);
    }
  }
}
for (const entry of SHOP_STOCK) {
  if (entry.item && !(entry.item in ITEMS)) errors.push(`Boutique ${entry.id}: objet ${entry.item} inconnu.`);
  if (entry.price < 0) errors.push(`Boutique ${entry.id}: prix négatif.`);
}
unique(SHOP_STOCK.map((entry) => entry.id), "Boutique", errors);
unique(SIDE_ACTIVITIES.map((activity) => activity.id), "Activités annexes", errors);

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

// — Le monde généré ————————————————————————————————————————
// Les cartes ne sont plus des fichiers mais le produit d'un générateur : ce
// sont ses invariants qu'il faut vérifier. Une seule zone mal cousue suffit à
// enfermer le joueur, et le symptôme n'apparaît qu'à la manette.

let openTiles = 0;
let solidTiles = 0;
for (const zone of WORLD_ZONES) {
  const map = new TileMap(createZoneMap(zone), tileSet);

  for (const edge of EDGES) {
    const neighbour = neighbourOf(zone, edge);
    if (!neighbour) continue;
    const here = gatewayFor(zone, edge);
    const there = gatewayFor(neighbour, oppositeEdge(edge));
    if (!here || !there || here.start !== there.start || here.end !== there.end) {
      errors.push(`Zone ${zone.id}: passage ${edge} désaligné avec ${neighbour.id}.`);
    }
  }

  const entries: { x: number; y: number }[] = [];
  for (const edge of EDGES) {
    if (!neighbourOf(zone, edge)) continue;
    if (edge === "west" || edge === "east") {
      const x = edge === "west" ? 0 : map.width - 1;
      const inner = edge === "west" ? 1 : map.width - 2;
      for (let y = 0; y < map.height; y += 1) if (!map.isSolid(x, y)) entries.push({ x: inner, y });
    } else {
      const y = edge === "north" ? 0 : map.height - 1;
      const inner = edge === "north" ? 1 : map.height - 2;
      for (let x = 0; x < map.width; x += 1) if (!map.isSolid(x, y)) entries.push({ x, y: inner });
    }
  }
  const usable = entries.filter((point) => !map.isSolid(point.x, point.y));
  if (usable.length === 0) {
    errors.push(`Zone ${zone.id}: aucune entrée praticable.`);
    continue;
  }

  const seen = new Set<number>([usable[0]!.y * map.width + usable[0]!.x]);
  const queue = [usable[0]!];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || map.isSolid(nx, ny)) continue;
      const key = ny * map.width + nx;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  const isolated = usable.filter((point) => !seen.has(point.y * map.width + point.x));
  if (isolated.length > 0) errors.push(`Zone ${zone.id}: ${isolated.length} sortie(s) isolée(s).`);

  for (let y = 1; y < map.height - 1; y += 1) {
    for (let x = 1; x < map.width - 1; x += 1) {
      if (map.isSolid(x, y)) solidTiles += 1;
      else openTiles += 1;
    }
  }
}

for (const object of INTERACTABLES) {
  const zone = WORLD_ZONES.find((candidate) => candidate.id === object.zone);
  if (!zone) continue;
  const map = new TileMap(createZoneMap(zone), tileSet);
  const tileX = Math.floor(object.x / 16);
  const tileY = Math.floor(object.y / 16) + (object.kind === "door" ? 1 : 0);
  const reachable = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]
    .some(([dx, dy]) => !map.isSolid(tileX + dx!, tileY + dy!));
  if (!reachable) errors.push(`Interactable ${object.id}: muré dans ${object.zone}.`);
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`✗ ${error}`));
  process.exitCode = 1;
} else {
  const openRatio = Math.round((openTiles / (openTiles + solidTiles)) * 100);
  console.log(`✓ Données valides · ${PALETTE_COLORS.length}/32 couleurs · ${NPCS.length} PNJ · `
    + `${QUESTS.length} quêtes · ${WORLD_ZONES.length} zones générées · ${openRatio}% de sol praticable`);
}
