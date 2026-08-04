import { PALETTE } from "../data/palette";
import { VIEW_HEIGHT, VIEW_WIDTH, type Renderer } from "../core/Renderer";
import type { Input } from "../core/Input";
import type { ZoneCoord } from "../core/Camera";

export type DeathPhase = "alive" | "falling" | "prompt";

/** Point de renaissance : le dernier puits touché, sinon la Place du Puits. */
export interface Checkpoint {
  readonly zone: ZoneCoord;
  readonly x: number;
  readonly y: number;
}

export const DEFAULT_CHECKPOINT: Checkpoint = { zone: { x: 3, y: 3 }, x: 240, y: 272 };

/** Durée de la chute avant l'affichage du menu de mort. */
export const FALL_FRAMES = 96;

/** Fraction de rubis perdue en mourant : on garde les trois quarts. */
export function rupeesAfterDeath(rupees: number): number {
  return Math.max(0, Math.floor(rupees * 0.75));
}

export class Death {
  phase: DeathPhase = "alive";
  private timer = 0;
  private checkpoint: Checkpoint = DEFAULT_CHECKPOINT;
  private deaths = 0;

  get active(): boolean { return this.phase !== "alive"; }
  get canChoose(): boolean { return this.phase === "prompt"; }
  get count(): number { return this.deaths; }
  get respawnPoint(): Checkpoint { return this.checkpoint; }

  setCheckpoint(zone: ZoneCoord, x: number, y: number): void {
    this.checkpoint = { zone: { ...zone }, x, y };
  }

  snapshot(): Checkpoint & { readonly deaths: number } {
    return { ...this.checkpoint, deaths: this.deaths };
  }

  restore(value: Partial<Checkpoint & { deaths: number }> | undefined): void {
    if (!value?.zone) return;
    this.checkpoint = {
      zone: { x: value.zone.x, y: value.zone.y },
      x: value.x ?? DEFAULT_CHECKPOINT.x,
      y: value.y ?? DEFAULT_CHECKPOINT.y,
    };
    this.deaths = value.deaths ?? 0;
  }

  /** Déclenche la séquence de mort. Retourne false si elle est déjà en cours. */
  begin(): boolean {
    if (this.active) return false;
    this.phase = "falling";
    this.timer = 0;
    this.deaths += 1;
    return true;
  }

  update(): void {
    if (this.phase !== "falling") return;
    this.timer += 1;
    if (this.timer >= FALL_FRAMES) this.phase = "prompt";
  }

  resolve(): void {
    this.phase = "alive";
    this.timer = 0;
  }

  /** Progression 0→1 du fondu au noir. */
  get fade(): number {
    if (this.phase === "prompt") return 1;
    if (this.phase !== "falling") return 0;
    return Math.min(1, this.timer / FALL_FRAMES);
  }

  draw(renderer: Renderer): void {
    if (!this.active) return;
    const { ctx } = renderer;
    const centre = VIEW_WIDTH / 2;
    ctx.save();
    ctx.globalAlpha = this.fade * 0.94;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.globalAlpha = 1;
    if (this.phase !== "prompt") {
      ctx.restore();
      return;
    }
    renderer.titleText("LA VALLÉE VOUS RATTRAPE", centre, 62, PALETTE.red);
    renderer.pixelText("Vos forces vous abandonnent.", centre, 82, PALETTE.stoneLight, "center");
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(centre - 96, 106, 192, 48);
    ctx.strokeStyle = PALETTE.sandLight;
    ctx.strokeRect(centre - 95.5, 106.5, 191, 47);
    renderer.pixelText("X   Renaître au puits", centre, 114, PALETTE.cream, "center");
    renderer.pixelText("C   Recharger la sauvegarde", centre, 132, PALETTE.cream, "center");
    renderer.pixelText(`Chutes : ${this.deaths}`, centre, 166, PALETTE.stoneDark, "center");
    renderer.pixelText("Vous laissez un quart de votre bourse derrière vous.",
      centre, 182, PALETTE.stoneDark, "center");
    ctx.restore();
  }

  /** Retourne le choix du joueur, ou null tant qu'il n'a pas tranché. */
  read(input: Input): "respawn" | "load" | null {
    if (this.phase !== "prompt") return null;
    if (input.wasPressed("A")) return "respawn";
    if (input.wasPressed("B")) return "load";
    return null;
  }
}
