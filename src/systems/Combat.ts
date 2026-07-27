import type { Rect } from "../entities/Entity";

export function overlaps(a: Readonly<Rect>, b: Readonly<Rect>): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

export class Combat {
  hitstopFrames = 0;
  shakeFrames = 0;
  private readonly hitThisSwing = new Set<string>();

  get frozen(): boolean { return this.hitstopFrames > 0; }

  update(): void {
    if (this.hitstopFrames > 0) this.hitstopFrames -= 1;
    if (this.shakeFrames > 0) this.shakeFrames -= 1;
  }

  beginSwing(): void { this.hitThisSwing.clear(); }

  confirmHit(targetId: string, heavy = false): boolean {
    if (this.hitThisSwing.has(targetId)) return false;
    this.hitThisSwing.add(targetId);
    this.hitstopFrames = 3;
    if (heavy) this.shakeFrames = 4;
    return true;
  }

  shakeOffset(frame: number): { x: number; y: number } {
    if (this.shakeFrames <= 0) return { x: 0, y: 0 };
    return { x: frame % 2 === 0 ? 2 : -2, y: frame % 4 < 2 ? 1 : -1 };
  }
}
