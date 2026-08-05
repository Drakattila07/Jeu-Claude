import type { LayerName, TiledLayer, TiledMapData } from "./TileMap";
import { TILE } from "./TileSet";
import type { Edge } from "../core/Camera";
import { hash2, randomAt } from "./WorldGen";
import type { EnemySpawn, EnemyType } from "../data/enemies";

/**
 * Donjons à salles.
 *
 * Les « intérieurs » du jeu tenaient tous en une pièce : on entrait, on voyait
 * tout, on ressortait. Un donjon est ici un petit plan de salles reliées par
 * des portes, dont certaines demandent une clé trouvée dans une autre salle.
 * Le plan est déterministe : la même forteresse deux parties de suite.
 */

export const ROOM_TILES_X = 24;
export const ROOM_TILES_Y = 14;
const W = ROOM_TILES_X;
const H = ROOM_TILES_Y;
const at = (x: number, y: number): number => y * W + x;

export type RoomKind = "entrance" | "hall" | "treasure" | "trial" | "boss";

export interface RoomLink {
  readonly edge: Edge;
  /** La porte demande une clé de la forteresse. */
  readonly locked: boolean;
}

export interface DungeonRoom {
  readonly x: number;
  readonly y: number;
  readonly kind: RoomKind;
  readonly links: readonly RoomLink[];
  /** Créatures qui gardent la salle. */
  readonly guards: readonly EnemyType[];
  /** Clé laissée par la dernière créature abattue. */
  readonly dropsKey?: boolean;
  /** Récompense posée dans la salle. */
  readonly prize?: "sea_chart" | "heart_shard" | "rupees";
}

export interface DungeonDefinition {
  readonly id: string;
  readonly name: string;
  readonly columns: number;
  readonly rows: number;
  readonly rooms: readonly DungeonRoom[];
  readonly floor: number;
  readonly wall: number;
}

/**
 * Vertepierre : trois portes, trois clés, un chevalier.
 *
 * Le plan est écrit à la main plutôt que tiré au sort — un donjon doit avoir
 * une progression lisible, pas une topologie surprenante à chaque partie.
 */
export const VERTEPIERRE: DungeonDefinition = {
  id: "vertepierre",
  name: "FORTERESSE DE VERTEPIERRE",
  columns: 3,
  rows: 3,
  floor: TILE.crackedPath,
  wall: TILE.cliff,
  rooms: [
    { x: 1, y: 2, kind: "entrance", guards: [], links: [
      { edge: "west", locked: false }, { edge: "north", locked: false }, { edge: "east", locked: false },
    ] },
    { x: 0, y: 2, kind: "trial", guards: ["castle_guard", "gargoyle"], dropsKey: true, links: [
      { edge: "east", locked: false }, { edge: "north", locked: false },
    ] },
    { x: 2, y: 2, kind: "treasure", guards: ["ember_mage"], prize: "heart_shard", links: [
      { edge: "west", locked: false }, { edge: "north", locked: true },
    ] },
    { x: 1, y: 1, kind: "hall", guards: ["castle_guard", "castle_guard"], links: [
      { edge: "south", locked: false }, { edge: "west", locked: false },
      { edge: "east", locked: false }, { edge: "north", locked: true },
    ] },
    { x: 0, y: 1, kind: "trial", guards: ["gargoyle", "ember_mage"], dropsKey: true, links: [
      { edge: "south", locked: false }, { edge: "east", locked: false },
      { edge: "north", locked: false },
    ] },
    { x: 2, y: 1, kind: "treasure", guards: ["castle_guard"], prize: "rupees", dropsKey: true, links: [
      { edge: "west", locked: false }, { edge: "south", locked: true },
      { edge: "north", locked: false },
    ] },
    // La salle du trône ne s'ouvre que par le sud : c'est la porte qui coûte
    // la dernière clé. Les deux salles hautes se rejoignent par les ailes,
    // sans quoi elles seraient des culs-de-sac derrière le Chevalier.
    { x: 1, y: 0, kind: "boss", guards: ["green_knight"], prize: "sea_chart", links: [
      { edge: "south", locked: true },
    ] },
    { x: 0, y: 0, kind: "treasure", guards: [], prize: "rupees", links: [
      { edge: "south", locked: false },
    ] },
    { x: 2, y: 0, kind: "hall", guards: ["ember_mage"], links: [
      { edge: "south", locked: false },
    ] },
  ],
};

export const DUNGEONS: Readonly<Record<string, DungeonDefinition>> = {
  vertepierre: VERTEPIERRE,
};

export function roomAt(dungeon: DungeonDefinition, x: number, y: number): DungeonRoom | null {
  return dungeon.rooms.find((room) => room.x === x && room.y === y) ?? null;
}

/** La salle d'entrée : c'est là qu'on arrive et qu'on ressort. */
export function entranceOf(dungeon: DungeonDefinition): DungeonRoom {
  return dungeon.rooms.find((room) => room.kind === "entrance") ?? dungeon.rooms[0]!;
}

function linkOn(room: DungeonRoom, edge: Edge): RoomLink | undefined {
  return room.links.find((link) => link.edge === edge);
}

/** Position d'une porte sur un bord, en tuiles. */
export function doorSpan(edge: Edge): readonly number[] {
  return edge === "north" || edge === "south"
    ? [Math.floor(W / 2) - 1, Math.floor(W / 2)]
    : [Math.floor(H / 2) - 1, Math.floor(H / 2)];
}

/**
 * Construit la carte d'une salle. Les portes fermées reçoivent une herse : on
 * voit tout de suite qu'il manque quelque chose, plutôt que de buter sur un
 * mur muet.
 */
export function createRoomMap(dungeon: DungeonDefinition, room: DungeonRoom,
  unlocked: ReadonlySet<string>): TiledMapData {
  const layers: Record<LayerName, number[]> = {
    ground: new Array<number>(W * H).fill(dungeon.floor),
    terrain: new Array<number>(W * H).fill(0),
    decor_below: new Array<number>(W * H).fill(0),
    decor_above: new Array<number>(W * H).fill(0),
  };
  const seed = hash2(room.x, room.y, 0x7e57);

  for (let x = 0; x < W; x += 1) {
    layers.terrain[at(x, 0)] = dungeon.wall;
    layers.terrain[at(x, 1)] = dungeon.wall;
    layers.terrain[at(x, H - 1)] = dungeon.wall;
  }
  for (let y = 2; y < H - 1; y += 1) {
    layers.terrain[at(0, y)] = dungeon.wall;
    layers.terrain[at(W - 1, y)] = dungeon.wall;
  }

  // Dallage : un tapis pour la salle du trône, des éclats ailleurs.
  if (room.kind === "boss") {
    for (let y = 3; y < H - 2; y += 1) {
      for (let x = 4; x < W - 4; x += 1) layers.ground[at(x, y)] = TILE.cobble;
    }
    for (const x of [3, W - 4]) {
      layers.terrain[at(x, 3)] = TILE.brazier;
      layers.terrain[at(x, H - 3)] = TILE.brazier;
    }
    layers.decor_above[at(6, 1)] = TILE.banner;
    layers.decor_above[at(W - 7, 1)] = TILE.banner;
  } else if (room.kind === "treasure") {
    for (let y = 5; y < 10; y += 1) {
      for (let x = 9; x < 15; x += 1) layers.ground[at(x, y)] = TILE.rug;
    }
    layers.terrain[at(4, 4)] = TILE.crate;
    layers.terrain[at(5, 4)] = TILE.barrel;
    layers.terrain[at(W - 5, H - 4)] = TILE.crate;
  } else if (room.kind === "trial") {
    // Colonnes en quinconce : de quoi se mettre à couvert d'un lanceur.
    for (const [cx, cy] of [[6, 4], [10, 8], [14, 4], [18, 8]] as const) {
      layers.terrain[at(cx, cy)] = TILE.ruinColumn;
      layers.decor_above[at(cx, cy - 1)] = TILE.archTop;
    }
  } else {
    for (const [cx, cy] of [[5, 5], [W - 6, 5], [5, H - 4], [W - 6, H - 4]] as const) {
      layers.terrain[at(cx, cy)] = TILE.ruinColumn;
    }
  }

  // Un peu de gravats, jamais au centre ni devant une porte.
  for (let y = 3; y < H - 3; y += 1) {
    for (let x = 3; x < W - 3; x += 1) {
      if (layers.terrain[at(x, y)] !== 0) continue;
      if (Math.abs(x - W / 2) < 3 && Math.abs(y - H / 2) < 3) continue;
      if (randomAt(x, y, seed) > 0.045) continue;
      layers.decor_below[at(x, y)] = TILE.pebbles;
    }
  }

  for (const edge of ["north", "south", "west", "east"] as const) {
    const link = linkOn(room, edge);
    if (!link) continue;
    const closed = link.locked && !unlocked.has(doorKey(dungeon, room, edge));
    for (const offset of doorSpan(edge)) {
      const x = edge === "west" ? 0 : edge === "east" ? W - 1 : offset;
      const y = edge === "north" ? 0 : edge === "south" ? H - 1 : offset;
      layers.terrain[at(x, y)] = closed ? TILE.portcullis : 0;
      // On dégage aussi la case juste derrière, sinon la porte donne sur un mur.
      const innerX = edge === "west" ? 1 : edge === "east" ? W - 2 : x;
      const innerY = edge === "north" ? 1 : edge === "south" ? H - 2 : y;
      if (!closed) layers.terrain[at(innerX, innerY)] = 0;
      layers.ground[at(innerX, innerY)] = dungeon.floor;
    }
  }

  // La salle d'entrée garde sa porte vers le dehors : sans elle, on entrerait
  // dans une forteresse dont on ne pourrait plus sortir.
  if (room.kind === "entrance") {
    for (const offset of doorSpan("south")) layers.terrain[at(offset, H - 1)] = TILE.door;
  }

  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name, width: W, height: H, data: layers[name],
  }));
  return { width: W, height: H, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}

/** Seuil de sortie de la salle d'entrée, en pixels. */
export const FORTRESS_EXIT = { x: Math.floor(W / 2) * 16 - 8, y: (H - 2) * 16 } as const;

export function nearFortressExit(position: { readonly x: number; readonly y: number }): boolean {
  return Math.hypot(position.x - FORTRESS_EXIT.x, position.y - FORTRESS_EXIT.y) <= 34;
}

/** Identifiant stable d'une porte, partagé par les deux salles qu'elle relie. */
export function doorKey(dungeon: DungeonDefinition, room: DungeonRoom, edge: Edge): string {
  const other = edge === "north" ? { x: room.x, y: room.y - 1 }
    : edge === "south" ? { x: room.x, y: room.y + 1 }
      : edge === "west" ? { x: room.x - 1, y: room.y } : { x: room.x + 1, y: room.y };
  const a = `${room.x},${room.y}`;
  const b = `${other.x},${other.y}`;
  return `${dungeon.id}:${a < b ? `${a}|${b}` : `${b}|${a}`}`;
}

/** Point d'apparition à l'entrée d'une salle, selon le bord franchi. */
export function roomEntry(edge: Edge | null): { x: number; y: number } {
  const centre = Math.floor(W / 2) * 16 - 8;
  if (edge === "north") return { x: centre, y: (H - 3) * 16 };
  if (edge === "south") return { x: centre, y: 2 * 16 };
  if (edge === "west") return { x: (W - 3) * 16, y: Math.floor(H / 2) * 16 - 8 };
  if (edge === "east") return { x: 2 * 16, y: Math.floor(H / 2) * 16 - 8 };
  return { x: centre, y: (H - 4) * 16 };
}

/** Créatures d'une salle, réparties sans se marcher dessus. */
export function roomSpawns(dungeon: DungeonDefinition, room: DungeonRoom): readonly EnemySpawn[] {
  const places: readonly (readonly [number, number])[] = [
    [7, 5], [16, 5], [7, 9], [16, 9], [11, 4], [11, 10],
  ];
  return room.guards.map((type, index) => {
    const [tileX, tileY] = places[index % places.length]!;
    return {
      id: `${dungeon.id}:${room.x},${room.y}:${index}`,
      zone: dungeon.id, type, x: tileX * 16, y: tileY * 16,
    };
  });
}
