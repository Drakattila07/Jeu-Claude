import { RNG } from "../core/RNG";
import type { Input } from "../core/Input";
import { VIEW_HEIGHT, VIEW_WIDTH, type Renderer } from "../core/Renderer";
import { PALETTE } from "../data/palette";

export type FishingState = "idle" | "waiting" | "bite" | "caught" | "missed";

export class Fishing {
  state: FishingState = "idle";
  private frame = 0;
  private biteFrame = 0;
  private resultFrames = 0;

  get active(): boolean { return this.state !== "idle"; }

  start(day: number, seed = 0xf157): void {
    this.state = "waiting";
    this.frame = 0;
    this.biteFrame = new RNG(seed ^ day).int(50, 110);
    this.resultFrames = 0;
  }

  /** Interrompt la séquence de pêche (mort, chargement…). */
  cancel(): void {
    this.state = "idle";
    this.frame = 0;
    this.resultFrames = 0;
  }

  update(input: Input): "caught" | "missed" | null {
    if (this.state === "idle") return null;
    if (this.state === "caught" || this.state === "missed") {
      this.resultFrames += 1;
      if (this.resultFrames >= 75 || input.wasPressed("B")) this.state = "idle";
      return null;
    }
    this.frame += 1;
    if (this.frame >= this.biteFrame) this.state = "bite";
    if (input.wasPressed("A")) {
      if (this.state === "bite" && this.frame <= this.biteFrame + 18) {
        this.state = "caught";
        return "caught";
      }
      this.state = "missed";
      return "missed";
    }
    if (this.state === "bite" && this.frame > this.biteFrame + 18) {
      this.state = "missed";
      return "missed";
    }
    return null;
  }

  draw(renderer: Renderer): void {
    if (!this.active) return;
    const { ctx } = renderer;
    const centre = VIEW_WIDTH / 2;
    const top = VIEW_HEIGHT - 92;
    ctx.save();
    ctx.fillStyle = "rgba(12,14,24,0.92)";
    ctx.fillRect(centre - 116, top, 232, 76);
    ctx.strokeStyle = PALETTE.waterLight;
    ctx.lineWidth = 1;
    ctx.strokeRect(centre - 115.5, top + 0.5, 231, 75);
    renderer.pixelText("PÊCHE", centre, top + 8, PALETTE.cream, "center");
    const message = this.state === "waiting" ? "Patience…"
      : this.state === "bite" ? "ÇA MORD !   X !"
      : this.state === "caught" ? "Un poisson-lune ! +8 rubis"
      : "Raté… Le lac ricane.";
    renderer.pixelText(message, centre, top + 26,
      this.state === "bite" ? PALETTE.yellow : PALETTE.grassLight, "center");

    // Plan d'eau et flotteur : la tension se voit avant de s'entendre.
    ctx.fillStyle = PALETTE.deepWater;
    ctx.fillRect(centre - 96, top + 48, 192, 14);
    ctx.fillStyle = PALETTE.water;
    for (let x = 0; x < 192; x += 8) {
      const wave = Math.sin((this.frame + x) / 9) * 2;
      ctx.fillRect(centre - 96 + x, top + 48 + wave, 6, 2);
    }
    const bobberX = centre - 96 + ((this.frame * 2.4) % 192);
    const dip = this.state === "bite" ? (Math.floor(this.frame / 3) % 2) * 4 : 0;
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(Math.round(bobberX), top + 40 + dip, 2, 10);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(Math.round(bobberX) - 2, top + 44 + dip, 6, 5);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(Math.round(bobberX) - 1, top + 45 + dip, 2, 2);
    ctx.restore();
  }
}
