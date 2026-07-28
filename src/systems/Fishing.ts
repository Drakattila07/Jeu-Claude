import { RNG } from "../core/RNG";
import type { Input } from "../core/Input";
import type { Renderer } from "../core/Renderer";
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
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(33, 70, 190, 77);
    ctx.strokeStyle = PALETTE.waterLight;
    ctx.strokeRect(34.5, 71.5, 187, 74);
    renderer.pixelText("PÊCHE", 128, 79, PALETTE.cream, "center");
    const message = this.state === "waiting" ? "Patience…"
      : this.state === "bite" ? "ÇA MORD !  X !"
      : this.state === "caught" ? "Un poisson-lune ! +8 rubis"
      : "Raté… Le lac ricane.";
    renderer.pixelText(message, 128, 103, this.state === "bite" ? PALETTE.yellow : PALETTE.grassLight, "center");
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(50, 126, 156, 6);
    const bobber = 50 + ((this.frame * 3) % 156);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(bobber, 121 + (this.state === "bite" ? 4 : 0), 3, 8);
  }
}
