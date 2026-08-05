import { PALETTE } from "../data/palette";
import type { Input } from "../core/Input";
import { VIEW_HEIGHT, VIEW_WIDTH, type Renderer } from "../core/Renderer";
import { drawText, measureText } from "./Font";

export interface Choice {
  readonly id: string;
  readonly label: string;
  readonly note?: string;
  /** Une option grisée reste visible mais refuse la validation. */
  readonly disabled?: boolean;
}

/**
 * Petit menu contextuel.
 *
 * Le jeu ne savait poser qu'une question à la fois, et seulement par des
 * touches dédiées — « X : libérer · C : enraciner ». Dès qu'un lieu offre
 * trois ou quatre gestes, il faut une liste : c'est ce que fournit cette
 * boîte, qui suspend le jeu tant qu'on n'a pas tranché.
 */
export class ChoiceBox {
  active = false;
  private title = "";
  private choices: readonly Choice[] = [];
  private cursor = 0;
  private frame = 0;

  open(title: string, choices: readonly Choice[]): void {
    if (choices.length === 0) return;
    this.title = title;
    this.choices = choices;
    this.cursor = choices.findIndex((choice) => !choice.disabled);
    if (this.cursor < 0) this.cursor = 0;
    this.frame = 0;
    this.active = true;
  }

  close(): void {
    this.active = false;
    this.choices = [];
  }

  /** Retourne l'identifiant choisi, `"cancel"` si l'on renonce, sinon `null`. */
  update(input: Input): string | null {
    if (!this.active) return null;
    this.frame += 1;
    if (input.wasPressed("Cancel") || input.wasPressed("B")) {
      this.close();
      return "cancel";
    }
    if (input.wasPressed("Up")) this.moveCursor(-1);
    if (input.wasPressed("Down")) this.moveCursor(1);
    if (!input.wasPressed("A") && !input.wasPressed("Start")) return null;
    const choice = this.choices[this.cursor];
    if (!choice || choice.disabled) return null;
    this.close();
    return choice.id;
  }

  /** Saute les options grisées : le curseur ne s'arrête jamais dessus. */
  private moveCursor(direction: number): void {
    for (let step = 1; step <= this.choices.length; step += 1) {
      const next = (this.cursor + direction * step + this.choices.length * step)
        % this.choices.length;
      if (!this.choices[next]?.disabled) { this.cursor = next; return; }
    }
  }

  draw(renderer: Renderer): void {
    if (!this.active) return;
    const { ctx } = renderer;
    const rows = this.choices.length;
    const width = Math.max(
      measureText(this.title) + 40,
      ...this.choices.map((choice) => measureText(choice.label) + 60),
      168);
    const height = 26 + rows * 15 + 14;
    const left = Math.round((VIEW_WIDTH - width) / 2);
    const top = Math.round((VIEW_HEIGHT - height) / 2) - 10;

    ctx.save();
    ctx.fillStyle = "rgba(8,10,18,0.55)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = "rgba(12,14,24,0.96)";
    ctx.fillRect(left, top, width, height);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(left, top, width, 1);
    ctx.fillRect(left, top + height - 1, width, 1);
    ctx.fillRect(left, top, 1, height);
    ctx.fillRect(left + width - 1, top, 1, height);

    drawText(ctx, this.title, left + width / 2, top + 8,
      { color: PALETTE.yellow, align: "center" });
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(left + 10, top + 22, width - 20, 1);

    this.choices.forEach((choice, index) => {
      const y = top + 28 + index * 15;
      const selected = index === this.cursor;
      if (selected) {
        ctx.fillStyle = PALETTE.pineDark;
        ctx.fillRect(left + 8, y - 3, width - 16, 14);
        ctx.fillStyle = PALETTE.yellow;
        const bob = Math.floor(this.frame / 16) % 2;
        ctx.fillRect(left + 11 + bob, y + 2, 4, 4);
      }
      drawText(ctx, choice.label, left + 22, y, {
        color: choice.disabled ? PALETTE.stoneDark
          : selected ? PALETTE.cream : PALETTE.stoneLight,
      });
      if (choice.note) {
        drawText(ctx, choice.note, left + width - 12, y, {
          color: choice.disabled ? PALETTE.stoneDark : PALETTE.grassLight, align: "right",
        });
      }
    });

    drawText(ctx, "↑↓ choisir · X valider · C renoncer", left + width / 2, top + height - 12,
      { color: PALETTE.stoneDark, align: "center" });
    ctx.restore();
  }
}
