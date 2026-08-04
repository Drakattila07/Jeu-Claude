import { BIOME_FAUNA, ENEMY_SPAWNS, type EnemySpawn } from "../data/enemies";
import type { WorldZoneData } from "../data/world";
import type { TileMap } from "../world/TileMap";
import { hash2, randomAt } from "../world/WorldGen";
import { TILE_SIZE } from "../core/Renderer";

/** Nombre de créatures visées selon le niveau de menace de la zone. */
const QUOTA: Readonly<Record<0 | 1 | 2 | 3, number>> = { 0: 0, 1: 1, 2: 3, 3: 4 };

/**
 * Distance minimale entre une créature et le joueur qui vient d'arriver.
 * En dessous, on se faisait mordre avant même d'avoir vu la région.
 */
const SAFE_RADIUS = 150;

export interface PopulationOptions {
  readonly zone: WorldZoneData;
  readonly map: TileMap;
  /** Le jour courant : la faune se renouvelle d'une nuit à l'autre. */
  readonly day: number;
  /** Position d'arrivée du joueur, tenue à l'écart. */
  readonly playerX: number;
  readonly playerY: number;
  /** La nuit densifie et durcit les rencontres. */
  readonly night: boolean;
  /** Zones déclarées pacifiées par le récit. */
  readonly peaceful: boolean;
}

/**
 * Peuple une zone.
 *
 * Dix ennemis écrits à la main pour cinquante-six régions laissaient la vallée
 * vide : on marchait vingt écrans sans rien croiser. Les rencontres du récit
 * restent intactes ; tout le reste se déduit du biome, du danger de la zone,
 * du jour et de l'heure — donc reproductible, mais jamais deux jours pareils.
 */
export function populateZone(options: PopulationOptions): readonly EnemySpawn[] {
  const { zone, map, day, night, peaceful } = options;
  const scripted = ENEMY_SPAWNS.filter((spawn) => spawn.zone === zone.id);
  if (peaceful || zone.danger === 0) return scripted;

  const fauna = BIOME_FAUNA[zone.biome];
  if (fauna.length === 0) return scripted;

  const quota = QUOTA[zone.danger] + (night ? 1 : 0) - scripted.length;
  if (quota <= 0) return scripted;

  const seed = hash2(zone.x, zone.y, 0x51a7 ^ Math.imul(day, 0x9e3779b1));
  const free = freeTiles(map, options);
  if (free.length === 0) return scripted;

  const spawns: EnemySpawn[] = [...scripted];
  for (let index = 0; index < quota; index += 1) {
    const pick = free[Math.floor(randomAt(index, day, seed) * free.length) % free.length]!;
    const type = fauna[Math.floor(randomAt(index + 31, day, seed ^ 0x77) * fauna.length) % fauna.length]!;
    // Deux créatures ne partagent jamais la même case de départ.
    if (spawns.some((spawn) => spawn.x === pick.x && spawn.y === pick.y)) continue;
    spawns.push({ id: `wild:${zone.id}:${day}:${index}`, zone: zone.id, type, x: pick.x, y: pick.y });
  }
  return spawns;
}

function freeTiles(map: TileMap, options: PopulationOptions): readonly { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  for (let tileY = 2; tileY < map.height - 2; tileY += 1) {
    for (let tileX = 2; tileX < map.width - 2; tileX += 1) {
      if (map.isSolid(tileX, tileY)) continue;
      // Une créature au milieu d'un goulet bloque le passage : il lui faut
      // de l'espace autour d'elle.
      let room = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (!map.isSolid(tileX + dx, tileY + dy)) room += 1;
      }
      if (room < 3) continue;
      const x = tileX * TILE_SIZE;
      const y = tileY * TILE_SIZE;
      if (Math.hypot(x - options.playerX, y - options.playerY) < SAFE_RADIUS) continue;
      spots.push({ x, y });
    }
  }
  return spots;
}
