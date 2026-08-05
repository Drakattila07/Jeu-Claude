import {
  DUNGEONS, doorKey, entranceOf, roomAt, roomSpawns,
  type DungeonDefinition, type DungeonRoom,
} from "../world/Dungeons";
import type { Edge } from "../core/Camera";
import type { EnemySpawn } from "../data/enemies";

/**
 * État d'une forteresse en cours d'exploration.
 *
 * Il vit à part du reste du monde : la salle courante, les portes déjà
 * ouvertes et les salles déjà nettoyées. Le tout se sérialise dans la
 * sauvegarde, faute de quoi mourir dans un donjon rouvrirait toutes ses
 * portes et ressusciterait tous ses gardes.
 */
export interface FortressSnapshot {
  readonly id: string | null;
  readonly room: { readonly x: number; readonly y: number } | null;
  readonly unlocked: readonly string[];
  readonly cleared: readonly string[];
}

export class Fortress {
  definition: DungeonDefinition | null = null;
  room: DungeonRoom | null = null;
  private readonly unlocked = new Set<string>();
  private readonly cleared = new Set<string>();

  get active(): boolean { return this.definition !== null && this.room !== null; }
  get name(): string { return this.definition?.name ?? ""; }
  get unlockedDoors(): ReadonlySet<string> { return this.unlocked; }

  enter(id: string): boolean {
    const definition = DUNGEONS[id];
    if (!definition) return false;
    this.definition = definition;
    this.room = entranceOf(definition);
    return true;
  }

  leave(): void {
    this.definition = null;
    this.room = null;
  }

  /** Clef d'une salle, telle qu'elle apparaît dans les ensembles d'état. */
  private static roomKey(definition: DungeonDefinition, room: DungeonRoom): string {
    return `${definition.id}:${room.x},${room.y}`;
  }

  isCleared(room: DungeonRoom = this.room!): boolean {
    if (!this.definition) return false;
    return this.cleared.has(Fortress.roomKey(this.definition, room));
  }

  markCleared(): void {
    if (!this.definition || !this.room) return;
    this.cleared.add(Fortress.roomKey(this.definition, this.room));
  }

  /** Créatures de la salle courante, vides si elle est déjà nettoyée. */
  spawns(): readonly EnemySpawn[] {
    if (!this.definition || !this.room || this.isCleared()) return [];
    return roomSpawns(this.definition, this.room);
  }

  /** Le lien franchissable dans une direction, s'il existe et s'il est ouvert. */
  passage(edge: Edge): { readonly room: DungeonRoom; readonly locked: boolean } | null {
    if (!this.definition || !this.room) return null;
    const link = this.room.links.find((candidate) => candidate.edge === edge);
    if (!link) return null;
    const delta = edge === "north" ? { x: 0, y: -1 } : edge === "south" ? { x: 0, y: 1 }
      : edge === "west" ? { x: -1, y: 0 } : { x: 1, y: 0 };
    const next = roomAt(this.definition, this.room.x + delta.x, this.room.y + delta.y);
    if (!next) return null;
    return { room: next, locked: link.locked && !this.unlocked.has(doorKey(this.definition, this.room, edge)) };
  }

  /** Ouvre une porte verrouillée. La clé est consommée par l'appelant. */
  unlock(edge: Edge): boolean {
    if (!this.definition || !this.room) return false;
    const key = doorKey(this.definition, this.room, edge);
    if (this.unlocked.has(key)) return false;
    this.unlocked.add(key);
    return true;
  }

  /** Portes verrouillées encore fermées, autour de la salle courante. */
  lockedEdges(): readonly Edge[] {
    if (!this.definition || !this.room) return [];
    return this.room.links
      .filter((link) => link.locked && !this.unlocked.has(doorKey(this.definition!, this.room!, link.edge)))
      .map((link) => link.edge);
  }

  moveTo(room: DungeonRoom): void { this.room = room; }

  snapshot(): FortressSnapshot {
    return {
      id: this.definition?.id ?? null,
      room: this.room ? { x: this.room.x, y: this.room.y } : null,
      unlocked: [...this.unlocked].sort(),
      cleared: [...this.cleared].sort(),
    };
  }

  restore(value: FortressSnapshot | undefined): void {
    this.unlocked.clear();
    this.cleared.clear();
    this.definition = null;
    this.room = null;
    if (!value) return;
    for (const key of value.unlocked) this.unlocked.add(key);
    for (const key of value.cleared) this.cleared.add(key);
    // On ne restaure jamais *dans* une salle : reprendre une partie au milieu
    // d'un donjon sans son contexte de combat serait déloyal.
  }
}
