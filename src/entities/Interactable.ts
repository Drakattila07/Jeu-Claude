import { PALETTE } from "../data/palette";
import type { InteractableData } from "../data/interactables";
import type { Vec2 } from "./Entity";
import { Entity } from "./Entity";

export type InteractionResult = { readonly message: string; readonly changed: boolean };

export class ZoneObjectState {
  private readonly values = new Map<string, boolean>();
  get(zoneId: string, entityId: string): boolean { return this.values.get(`${zoneId}:${entityId}`) ?? false; }
  set(zoneId: string, entityId: string): void { this.values.set(`${zoneId}:${entityId}`, true); }
  entries(): readonly [string, boolean][] { return [...this.values.entries()]; }
  restore(entries: readonly [string, boolean][]): void {
    this.values.clear();
    for (const [key, value] of entries) this.values.set(key, value);
  }
}

export class Interactable extends Entity {
  constructor(
    readonly data: InteractableData,
    private readonly state: ZoneObjectState,
  ) {
    super({ x: data.x, y: data.y }, { x: 1, y: 5, width: 14, height: 11 });
    this.depth = 8;
  }

  update(): void {}

  distanceTo(position: Readonly<Vec2>): number {
    return Math.hypot(this.position.x - position.x, this.position.y - position.y);
  }

  bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.position.x + this.hitbox.x, y: this.position.y + this.hitbox.y,
      width: this.hitbox.width, height: this.hitbox.height };
  }

  interact(): InteractionResult {
    if (this.data.kind === "chest" || this.data.kind === "seal"
      || this.data.kind === "roots" || this.data.kind === "mechanism"
      || this.data.kind === "footprints" || this.data.kind === "pickup"
      || this.data.kind === "secret") {
      if (this.state.get(this.data.zone, this.data.id)) return { message: "Il n'y a plus rien ici.", changed: false };
      this.state.set(this.data.zone, this.data.id);
      return { message: this.data.text, changed: true };
    }
    if (this.data.kind === "bush") {
      this.state.set(this.data.zone, this.data.id);
      return { message: "Le buisson se disperse en feuilles.", changed: true };
    }
    return { message: this.data.text, changed: false };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state.get(this.data.zone, this.data.id) && this.data.kind === "bush") return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    ctx.save();
    if (this.data.kind === "chest") {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 1, y + 5, 14, 10);
      ctx.fillStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.stone : PALETTE.woodLight;
      ctx.fillRect(x + 2, y + 4, 12, 5);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 7, y + 8, 2, 3);
    } else if (this.data.kind === "pot") {
      ctx.fillStyle = PALETTE.sandLight;
      ctx.fillRect(x + 4, y + 3, 8, 3);
      ctx.fillStyle = PALETTE.soil;
      ctx.fillRect(x + 2, y + 6, 12, 8);
    } else if (this.data.kind === "bush") {
      ctx.fillStyle = PALETTE.leafDark;
      ctx.fillRect(x + 1, y + 6, 14, 9);
      ctx.fillStyle = PALETTE.leaf;
      ctx.fillRect(x + 3, y + 3, 6, 9);
      ctx.fillRect(x + 8, y + 2, 5, 10);
    } else if (this.data.kind === "cauldron") {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 1, y + 6, 14, 8);
      ctx.fillStyle = PALETTE.purple;
      ctx.fillRect(x + 3, y + 5, 10, 3);
      ctx.fillStyle = PALETTE.leafLight;
      ctx.fillRect(x + 5, y + 2, 2, 2);
      ctx.fillRect(x + 10, y, 2, 2);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 5, y + 14, 6, 2);
    } else if (this.data.kind === "valve") {
      ctx.strokeStyle = PALETTE.stoneLight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.roof;
      ctx.fillRect(x + 7, y + 2, 2, 12);
      ctx.fillRect(x + 2, y + 7, 12, 2);
    } else if (this.data.kind === "roots") {
      if (this.state.get(this.data.zone, this.data.id)) return;
      ctx.strokeStyle = PALETTE.woodDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.bezierCurveTo(x + 14, y + 4, x + 1, y + 12, x + 16, y + 15);
      ctx.moveTo(x + 16, y + 1);
      ctx.bezierCurveTo(x + 2, y + 5, x + 15, y + 10, x, y + 15);
      ctx.stroke();
    } else if (this.data.kind === "footprints") {
      ctx.fillStyle = PALETTE.soil;
      ctx.fillRect(x + 2, y + 9, 5, 7);
      ctx.fillRect(x + 10, y + 1, 5, 7);
    } else if (this.data.kind === "seal") {
      ctx.fillStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.leafLight : PALETTE.stoneDark;
      ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 7, y + 4, 2, 8);
      ctx.fillRect(x + 4, y + 7, 8, 2);
    } else if (this.data.kind === "mechanism") {
      ctx.strokeStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.waterLight : PALETTE.stoneLight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 6, y + 6, 4, 4);
    } else if (this.data.kind === "pickup") {
      if (this.state.get(this.data.zone, this.data.id)) return;
      ctx.fillStyle = PALETTE.woodLight;
      ctx.fillRect(x + 7, y, 2, 13);
      ctx.strokeStyle = PALETTE.cream;
      ctx.beginPath();
      ctx.arc(x + 11, y + 11, 4, 0, Math.PI);
      ctx.stroke();
    } else if (this.data.kind === "secret") {
      ctx.fillStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.yellow : PALETTE.purple;
      ctx.fillRect(x + 5, y + 5, 6, 6);
      ctx.fillRect(x + 7, y + 2, 2, 12);
      ctx.fillRect(x + 2, y + 7, 12, 2);
    }
    ctx.restore();
  }
}
