import { WORLD_ZONES, type Biome, type WorldZoneData } from "../data/world";
import { ZONE_TILES_X, ZONE_TILES_Y } from "../core/Renderer";
import type { Edge, ZoneCoord } from "../core/Camera";

/**
 * Modèle macroscopique du monde.
 *
 * L'ancien générateur travaillait zone par zone, sans jamais regarder les
 * voisines : deux écrans mitoyens n'avaient aucune raison d'aligner leurs
 * ouvertures, et le sentier « principal » était une croix plaquée au même
 * endroit sur les cinquante-six cartes. On construit maintenant d'abord la
 * vallée entière — passages partagés, réseau de routes, cours d'eau — puis
 * chaque zone se dessine en respectant ce contrat.
 */

/** Mélange de bits : rapide, sans état, et identique d'une exécution à l'autre. */
export function hash2(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 0x1f83d9ab, 374761393) ^ Math.imul(y + 0x5be0cd19, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

export function randomAt(x: number, y: number, seed: number): number {
  return hash2(x, y, seed) / 4294967296;
}

function smooth(t: number): number { return t * t * (3 - 2 * t); }

/** Bruit de valeur bilinéaire — des taches douces plutôt qu'un poivre uniforme. */
export function valueNoise(x: number, y: number, seed: number, frequency: number): number {
  const fx = x * frequency;
  const fy = y * frequency;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const a = randomAt(x0, y0, seed);
  const b = randomAt(x0 + 1, y0, seed);
  const c = randomAt(x0, y0 + 1, seed);
  const d = randomAt(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/** Bruit fractal : trois octaves suffisent à casser toute régularité visible. */
export function fbm(x: number, y: number, seed: number, frequency = 0.12): number {
  let amplitude = 1;
  let total = 0;
  let normaliser = 0;
  let scale = frequency;
  for (let octave = 0; octave < 3; octave += 1) {
    total += valueNoise(x, y, seed + octave * 7919, scale) * amplitude;
    normaliser += amplitude;
    amplitude *= 0.5;
    scale *= 2.1;
  }
  return total / normaliser;
}

/** Graine du monde. Une seule valeur gouverne toute la vallée. */
export const VALLEY_SEED = 0x9e3779b9;

export function zoneSeed(zone: ZoneCoord): number {
  return hash2(zone.x, zone.y, VALLEY_SEED);
}

const ZONE_BY_KEY = new Map<string, WorldZoneData>(
  WORLD_ZONES.map((zone) => [`${zone.x},${zone.y}`, zone]),
);

export function zoneAt(x: number, y: number): WorldZoneData | null {
  return ZONE_BY_KEY.get(`${x},${y}`) ?? null;
}

export function neighbourOf(zone: ZoneCoord, edge: Edge): WorldZoneData | null {
  if (edge === "north") return zoneAt(zone.x, zone.y - 1);
  if (edge === "south") return zoneAt(zone.x, zone.y + 1);
  if (edge === "west") return zoneAt(zone.x - 1, zone.y);
  return zoneAt(zone.x + 1, zone.y);
}

export const EDGES: readonly Edge[] = ["north", "east", "south", "west"];

export function oppositeEdge(edge: Edge): Edge {
  return edge === "north" ? "south" : edge === "south" ? "north"
    : edge === "west" ? "east" : "west";
}

/**
 * Identifiant d'une frontière, vu identiquement des deux côtés. C'est la clef
 * de toute la cohérence : les deux zones qui se partagent un bord tirent leur
 * passage du même nombre, donc au même endroit.
 */
function edgeKey(zone: ZoneCoord, edge: Edge): { readonly x: number; readonly y: number; readonly vertical: boolean } {
  if (edge === "east") return { x: zone.x, y: zone.y, vertical: true };
  if (edge === "west") return { x: zone.x - 1, y: zone.y, vertical: true };
  if (edge === "south") return { x: zone.x, y: zone.y, vertical: false };
  return { x: zone.x, y: zone.y - 1, vertical: false };
}

export interface Gateway {
  /** Première et dernière tuile ouverte, sur l'axe du bord. */
  readonly start: number;
  readonly end: number;
  /** Le passage porte-t-il une route pavée ? */
  readonly road: boolean;
}

/**
 * Demi-largeur du passage, en tuiles.
 *
 * Assez large pour qu'on le repère en longeant la clôture, assez étroit pour
 * que la frontière reste un lieu. Une ouverture de cinq cases se manquait trop
 * facilement quand on arrivait par le mauvais bout du bord.
 */
const GATE_HALF_WIDTH = 3;
const ROAD_GATE_HALF_WIDTH = 4;

/**
 * Passage partagé entre une zone et sa voisine, ou `null` s'il n'y a pas de
 * voisine de ce côté (bord du monde).
 */
export function gatewayFor(zone: ZoneCoord, edge: Edge): Gateway | null {
  if (!neighbourOf(zone, edge)) return null;
  const key = edgeKey(zone, edge);
  const vertical = key.vertical;
  const span = vertical ? ZONE_TILES_Y : ZONE_TILES_X;
  const road = isRoadEdge(zone, edge);
  const half = road ? ROAD_GATE_HALF_WIDTH : GATE_HALF_WIDTH;
  const margin = half + 3;
  const range = span - margin * 2;
  const center = margin + Math.floor(randomAt(key.x, key.y, VALLEY_SEED ^ (vertical ? 0x51ed : 0x2f9d)) * range);
  return { start: center - half, end: center + half, road };
}

/** Centre du passage, en tuiles. */
export function gatewayCenter(gateway: Gateway): number {
  return Math.round((gateway.start + gateway.end) / 2);
}

// — Réseau de routes ——————————————————————————————————————————————

/** Coût de traversée d'un biome pour le tracé des routes. */
function roadFriction(biome: Biome): number {
  switch (biome) {
    case "village": return 1;
    case "fields": return 2;
    case "river": return 4;
    case "forest": return 5;
    case "ruins": return 6;
    case "canal": return 7;
    case "marsh": return 9;
    case "reeds": return 10;
    case "witch": return 8;
    case "cliffs": return 12;
    case "peaks": return 14;
    case "lake": return 18;
    default: return 8;
  }
}

function edgeId(zone: ZoneCoord, edge: Edge): string {
  const key = edgeKey(zone, edge);
  return `${key.vertical ? "v" : "h"}:${key.x}:${key.y}`;
}

/**
 * Arbre couvrant de poids minimal sur la grille des zones. Il en sort un
 * chemin unique entre deux points quelconques de la vallée : la route évite
 * naturellement les marais et les sommets, sans qu'on ait rien à tracer à la
 * main, et le joueur qui la suit finit toujours par arriver quelque part.
 */
function buildRoadNetwork(): ReadonlySet<string> {
  interface Link { readonly a: WorldZoneData; readonly b: WorldZoneData; readonly weight: number; readonly id: string }
  const links: Link[] = [];
  for (const zone of WORLD_ZONES) {
    for (const edge of ["east", "south"] as const) {
      const neighbour = neighbourOf(zone, edge);
      if (!neighbour) continue;
      const jitter = randomAt(zone.x, zone.y, VALLEY_SEED ^ 0x77) * 0.9;
      links.push({
        a: zone, b: neighbour, id: edgeId(zone, edge),
        weight: roadFriction(zone.biome) + roadFriction(neighbour.biome) + jitter,
      });
    }
  }
  links.sort((first, second) => first.weight - second.weight || first.id.localeCompare(second.id));

  const parent = new Map<string, string>(WORLD_ZONES.map((zone) => [zone.id, zone.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cursor = id;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor)!;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };

  const chosen = new Set<string>();
  for (const link of links) {
    const rootA = find(link.a.id);
    const rootB = find(link.b.id);
    if (rootA === rootB) continue;
    parent.set(rootA, rootB);
    chosen.add(link.id);
  }
  // Quelques boucles rendent le réseau vivant : sans elles, toute route est un
  // cul-de-sac déguisé et l'on revient sans cesse sur ses pas.
  for (const link of links) {
    if (chosen.has(link.id)) continue;
    if (randomAt(link.a.x * 31 + link.b.x, link.a.y * 17 + link.b.y, VALLEY_SEED ^ 0xa17) < 0.12) {
      chosen.add(link.id);
    }
  }
  return chosen;
}

const ROAD_EDGES = buildRoadNetwork();

export function isRoadEdge(zone: ZoneCoord, edge: Edge): boolean {
  if (!neighbourOf(zone, edge)) return false;
  return ROAD_EDGES.has(edgeId(zone, edge));
}

/** Bords qui portent une route pour une zone donnée. */
export function roadEdgesOf(zone: ZoneCoord): readonly Edge[] {
  return EDGES.filter((edge) => isRoadEdge(zone, edge));
}

// — Cours d'eau ————————————————————————————————————————————————

/**
 * Les zones aquatiques forment des chaînes : une rivière descend, un lac
 * s'étale, un canal file droit. On note simplement, pour chaque bord, si de
 * l'eau doit le traverser — les deux zones voisines lisent la même réponse.
 */
const WATER_BIOMES = new Set<Biome>(["river", "lake", "canal", "reeds", "marsh"]);

export function isWaterEdge(zone: ZoneCoord, edge: Edge): boolean {
  const here = zoneAt(zone.x, zone.y);
  const there = neighbourOf(zone, edge);
  if (!here || !there) return false;
  return WATER_BIOMES.has(here.biome) && WATER_BIOMES.has(there.biome);
}

export function waterEdgesOf(zone: ZoneCoord): readonly Edge[] {
  return EDGES.filter((edge) => isWaterEdge(zone, edge));
}
