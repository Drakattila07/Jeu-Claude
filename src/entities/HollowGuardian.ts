import { PALETTE } from "../data/palette";
import { ROOM_TILES_X, ROOM_TILES_Y } from "../world/Dungeons";
import { TILE_SIZE } from "../core/Renderer";
import type { Player } from "./Player";
import { Entity, type Rect } from "./Entity";

interface Spore { x: number; y: number; vx: number; vy: number; active: boolean }
/** Racine qui perce le sol : l'anneau de la Gardienne, et sa cage finale. */
export interface RootEruption { x: number; y: number; timer: number }

const ROOM_W = ROOM_TILES_X * TILE_SIZE;
const ROOM_H = ROOM_TILES_Y * TILE_SIZE;
const ARENA_X = ROOM_W / 2 - 24;
const ARENA_Y = 64;

/**
 * La Gardienne des Racines.
 *
 * Elle ne bouge pas — un arbre s'arrache, un gardien tient. Le combat se lit
 * dans son rythme : un anneau de racines force à se replacer, puis elle
 * s'ouvre. Ne pas confondre avec l'Arbre-Mère : ici rien ne brûle et rien ne
 * dépend de la forme démoniaque, la gardienne se bat seule, à l'ancienne.
 */
export class HollowGuardian extends Entity {
  maxHearts = 20;
  hearts = 20;
  flashFrames = 0;
  exposedFrames = 0;
  private frame = 0;
  readonly spores: Spore[] = [];
  readonly eruptions: RootEruption[] = [];

  constructor(private readonly target: Player) {
    super({ x: ARENA_X, y: ARENA_Y }, { x: 6, y: 10, width: 36, height: 52 });
    this.depth = 20;
  }

  get phase(): 1 | 2 | 3 {
    if (this.hearts > 13) return 1;
    if (this.hearts > 6) return 2;
    return 3;
  }

  get bounds(): Rect {
    return { x: this.position.x + 6, y: this.position.y + 10, width: 36, height: 52 };
  }

  get healthRatio(): number { return Math.max(0, this.hearts / this.maxHearts); }
  get isExposed(): boolean { return this.exposedFrames > 0; }

  update(): void {
    if (!this.active) return;
    this.frame += 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    if (this.exposedFrames > 0) this.exposedFrames -= 1;

    const slamPeriod = this.phase === 1 ? 150 : this.phase === 2 ? 112 : 84;
    if (this.frame % slamPeriod === 0) this.slam();

    const sporePeriod = this.phase === 1 ? 999999 : this.phase === 2 ? 130 : 96;
    if (this.frame % sporePeriod === 0) this.fireSpores();

    if (this.phase === 3 && this.frame % 70 === 0) this.cage();

    for (const spore of this.spores) {
      spore.x += spore.vx;
      spore.y += spore.vy;
      if (spore.x < 0 || spore.x > ROOM_W || spore.y < 0 || spore.y > ROOM_H) spore.active = false;
    }
    for (const eruption of this.eruptions) eruption.timer -= 1;
    for (let index = this.eruptions.length - 1; index >= 0; index -= 1) {
      if (this.eruptions[index]!.timer <= 0) this.eruptions.splice(index, 1);
    }
  }

  /** Anneau de racines autour d'elle-même : il faut être au bon rayon. */
  private slam(): void {
    const centre = { x: this.position.x + 24, y: this.position.y + 40 };
    const count = this.phase === 1 ? 6 : this.phase === 2 ? 8 : 10;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      this.eruptions.push({
        x: centre.x + Math.cos(angle) * 58, y: centre.y + Math.sin(angle) * 40,
        timer: 52,
      });
    }
    this.exposedFrames = this.phase === 3 ? 70 : 100;
  }

  /** Cage finale : trois éruptions sous les pieds du joueur, phase 3 seulement. */
  private cage(): void {
    for (let index = 0; index < 3; index += 1) {
      this.eruptions.push({
        x: this.target.position.x + (index - 1) * 30,
        y: this.target.position.y + 8,
        timer: 44,
      });
    }
  }

  private fireSpores(): void {
    const count = this.phase === 2 ? 3 : 5;
    const dx = this.target.position.x - (this.position.x + 24);
    const dy = this.target.position.y - (this.position.y + 34);
    const base = Math.atan2(dy, dx);
    const spread = 0.7;
    for (let index = 0; index < count; index += 1) {
      const offset = (index / (count - 1) - 0.5) * spread;
      const angle = base + offset;
      const speed = 1.3 + this.phase * 0.15;
      this.spores.push({
        x: this.position.x + 24, y: this.position.y + 34,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, active: true,
      });
    }
  }

  /** Racines effectivement sorties : c'est elles qui blessent. */
  eruptionBounds(): readonly Rect[] {
    return this.eruptions
      .filter((eruption) => eruption.timer <= 30 && eruption.timer > 10)
      .map((eruption) => ({ x: eruption.x - 7, y: eruption.y - 22, width: 14, height: 26 }));
  }

  hit(damage = 1): boolean {
    if (!this.active || this.flashFrames > 0) return false;
    if (this.exposedFrames <= 0) {
      this.flashFrames = 3;
      return false;
    }
    this.hearts -= Math.max(1, damage);
    this.flashFrames = 5;
    if (this.hearts <= 0) this.active = false;
    return !this.active;
  }

  private drawCore(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const pulse = (Math.sin(this.frame / 8) + 1) / 2;
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.fillStyle = "#7cffc4";
    ctx.fillRect(x + 14, y + 20, 10, 12);
    ctx.globalAlpha = 0.8 + pulse * 0.2;
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x + 17, y + 24, 4, 4);
    ctx.globalAlpha = 1;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const exposed = this.isExposed;
    ctx.save();

    ctx.globalAlpha = 0.32;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 4, y + 60, 40, 6);
    ctx.globalAlpha = 1;

    const tint = this.flashFrames > 0 ? PALETTE.white : PALETTE.woodDark;
    // Socle de racines tressées.
    ctx.fillStyle = tint;
    ctx.fillRect(x + 2, y + 42, 12, 20);
    ctx.fillRect(x + 34, y + 42, 12, 20);
    ctx.fillRect(x + 8, y + 50, 32, 12);
    // Torse, plus clair : c'est l'écorce vivante, pas la racine morte.
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.wood;
    ctx.fillRect(x + 8, y + 12, 32, 34);
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.woodLight;
    ctx.fillRect(x + 12, y + 16, 24, 6);
    // Deux bras-racines, levés en garde.
    ctx.fillStyle = tint;
    ctx.fillRect(x, y + 14, 8, 26);
    ctx.fillRect(x + 40, y + 14, 8, 26);
    // La tête : un noeud de racines couronné de mousse claire.
    ctx.fillStyle = tint;
    ctx.fillRect(x + 12, y, 24, 16);
    ctx.fillStyle = PALETTE.leafDark;
    ctx.fillRect(x + 10, y - 3, 28, 6);
    ctx.fillStyle = exposed ? PALETTE.yellow : PALETTE.purple;
    ctx.fillRect(x + 16, y + 5, 4, 4);
    ctx.fillRect(x + 28, y + 5, 4, 4);

    if (exposed) {
      this.drawCore(ctx, x, y);
      ctx.globalAlpha = 0.2 + Math.sin(this.frame / 5) * 0.08;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 4, y, 40, 62);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 14, y + 20, 10, 12);
      ctx.globalAlpha = 1;
    }

    // Marques au sol des éruptions en préparation, puis les racines dressées.
    for (const eruption of this.eruptions) {
      if (eruption.timer > 30) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = PALETTE.purple;
        ctx.fillRect(Math.round(eruption.x) - 7, Math.round(eruption.y) - 3, 14, 6);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(Math.round(eruption.x) - 4, Math.round(eruption.y) - 24, 8, 24);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(Math.round(eruption.x) - 2, Math.round(eruption.y) - 22, 3, 20);
    }

    for (const spore of this.spores) {
      if (!spore.active) continue;
      ctx.fillStyle = "#7cffc4";
      ctx.fillRect(Math.round(spore.x) - 2, Math.round(spore.y) - 2, 5, 5);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(Math.round(spore.x) - 1, Math.round(spore.y) - 1, 2, 2);
    }
    ctx.restore();
  }
}
