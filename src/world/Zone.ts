import { WORLD_ZONES, type WorldZoneData } from "../data/world";
import type { ZoneCoord } from "../core/Camera";

export class ZoneRegistry {
  private readonly zones = new Map<string, WorldZoneData>(
    WORLD_ZONES.map((zone) => [`${zone.x},${zone.y}`, zone]),
  );

  at(coord: ZoneCoord): WorldZoneData | null {
    return this.zones.get(`${coord.x},${coord.y}`) ?? null;
  }

  canEnter(coord: ZoneCoord): boolean {
    return this.at(coord) !== null;
  }
}
