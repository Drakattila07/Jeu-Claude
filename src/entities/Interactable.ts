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
    if (this.data.kind === "chest") {
      if (this.state.get(this.data.zone, this.data.id)) return { message: "Le coffre est vide.", changed: false };
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
    }
    ctx.restore();
  }
}
