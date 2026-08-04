import { PALETTE } from "../data/palette";
import { VIEW_HEIGHT, VIEW_WIDTH, type Renderer } from "../core/Renderer";
import type { Input } from "../core/Input";
import { drawText, measureText } from "./Font";

export type TitleChoice = "new" | "continue" | "controls";

interface Option { readonly id: TitleChoice; readonly label: string; readonly note: string }

/**
 * Écran-titre.
 *
 * Le jeu démarrait directement dans la partie, sans jamais se présenter ni
 * laisser le choix entre reprendre et recommencer — une sauvegarde bancale
 * condamnait donc silencieusement la partie. On pose ici un seuil.
 */
export class TitleScreen {
  active = true;
  private cursor = 0;
  private frame = 0;
  private showControls = false;
  private options: Option[] = [];

  constructor(hasSave: boolean, private readonly saveLabel = "") {
    this.setSave(hasSave);
  }

  setSave(hasSave: boolean): void {
    this.options = [
      ...(hasSave
        ? [{ id: "continue" as const, label: "CONTINUER", note: this.saveLabel || "Reprendre la partie" }]
        : []),
      { id: "new", label: "NOUVELLE PARTIE", note: "La vallée se réveille au matin" },
      { id: "controls", label: "COMMANDES", note: "Clavier et manette" },
    ];
    this.cursor = 0;
  }

  update(input: Input): TitleChoice | null {
    this.frame += 1;
    if (!this.active) return null;
    if (this.showControls) {
      if (input.wasPressed("A") || input.wasPressed("Cancel") || input.wasPressed("Start")) {
        this.showControls = false;
      }
      return null;
    }
    if (input.wasPressed("Up")) this.cursor = (this.cursor + this.options.length - 1) % this.options.length;
    if (input.wasPressed("Down")) this.cursor = (this.cursor + 1) % this.options.length;
    if (!input.wasPressed("A") && !input.wasPressed("Start") && !input.wasPressed("Attack")) return null;

    const choice = this.options[this.cursor]!.id;
    if (choice === "controls") { this.showControls = true; return null; }
    this.active = false;
    return choice;
  }

  draw(renderer: Renderer): void {
    if (!this.active) return;
    const { ctx } = renderer;
    ctx.save();
    this.drawBackdrop(ctx);
    this.drawLogo(ctx);
    if (this.showControls) this.drawControls(ctx);
    else this.drawMenu(ctx);
    ctx.restore();
  }

  /** Ciel dégradé, collines en silhouette, lucioles : trois plans, pas plus. */
  private drawBackdrop(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    sky.addColorStop(0, "#131a33");
    sky.addColorStop(0.45, "#26324f");
    sky.addColorStop(0.75, "#43405c");
    sky.addColorStop(1, "#1a2130");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Étoiles fixes : leur scintillement suit une phase propre à chacune.
    for (let index = 0; index < 60; index += 1) {
      const x = (index * 79) % VIEW_WIDTH;
      const y = (index * 37) % 110;
      const twinkle = Math.sin((this.frame + index * 20) / 34);
      if (twinkle < 0.1) continue;
      ctx.globalAlpha = 0.25 + twinkle * 0.55;
      ctx.fillStyle = index % 7 === 0 ? PALETTE.waterLight : PALETTE.cream;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Lune : un disque mordu par un second disque, plutôt que deux carrés.
    const moonX = VIEW_WIDTH - 62;
    const moonY = 36;
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = PALETTE.cream;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.cream;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#212c47";
    ctx.beginPath();
    ctx.arc(moonX - 6, moonY - 3, 11, 0, Math.PI * 2);
    ctx.fill();

    for (const [depth, baseY, color] of [
      [0, 128, "#1d2b31"], [1, 148, "#16232a"], [2, 170, "#101a20"],
    ] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_HEIGHT);
      for (let x = 0; x <= VIEW_WIDTH; x += 8) {
        const wave = Math.sin((x + depth * 90 + this.frame * (0.12 + depth * 0.05)) / (44 + depth * 22));
        ctx.lineTo(x, baseY + wave * (7 + depth * 4));
      }
      ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Sapins plantés sur la crête la plus proche.
      if (depth !== 2) continue;
      ctx.fillStyle = "#0b1218";
      for (let x = 6; x < VIEW_WIDTH; x += 17) {
        const wave = Math.sin((x + 180 + this.frame * 0.22) / 88);
        const top = baseY + wave * 15 - 14 - ((x * 7) % 9);
        ctx.fillRect(x + 3, top + 10, 2, 12);
        ctx.beginPath();
        ctx.moveTo(x + 4, top);
        ctx.lineTo(x + 10, top + 14);
        ctx.lineTo(x - 2, top + 14);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (let index = 0; index < 18; index += 1) {
      const pulse = (Math.sin((this.frame + index * 41) / 24) + 1) / 2;
      if (pulse < 0.3) continue;
      const x = (index * 53 + Math.sin((this.frame + index * 30) / 90) * 22) % VIEW_WIDTH;
      const y = 118 + ((index * 29) % 80) + Math.sin((this.frame + index * 17) / 40) * 5;
      ctx.globalAlpha = pulse * 0.8;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawLogo(ctx: CanvasRenderingContext2D): void {
    const title = "LES RACINES CREUSES";
    const centre = VIEW_WIDTH / 2;
    const width = measureText(title);
    // Le titre est dessiné trois fois à des échelles décroissantes : une
    // épaisseur qu'un simple contour ne donne pas.
    ctx.save();
    ctx.translate(centre, 40);
    ctx.scale(2, 2);
    drawText(ctx, title, 0, 0, {
      color: PALETTE.cream, align: "center", outline: "rgba(8,6,14,0.95)", shadow: null,
    });
    ctx.restore();

    ctx.fillStyle = PALETTE.sandLight;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(centre - width, 64, width * 2, 1);
    ctx.globalAlpha = 1;
    drawText(ctx, "UN CONTE DE LA VALLÉE DE BRUYÈRE", centre, 70, {
      color: PALETTE.grassLight, align: "center", letterSpacing: 1,
    });
  }

  private drawMenu(ctx: CanvasRenderingContext2D): void {
    const top = 118;
    this.options.forEach((option, index) => {
      const y = top + index * 22;
      const selected = index === this.cursor;
      const width = measureText(option.label) + 44;
      if (selected) {
        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.fillRect(VIEW_WIDTH / 2 - width / 2, y - 4, width, 18);
        ctx.fillStyle = PALETTE.yellow;
        const bob = Math.floor(this.frame / 18) % 2;
        ctx.fillRect(VIEW_WIDTH / 2 - width / 2 + 8 + bob, y + 2, 5, 5);
      }
      drawText(ctx, option.label, VIEW_WIDTH / 2, y, {
        color: selected ? PALETTE.cream : PALETTE.stoneLight,
        align: "center", outline: selected ? "rgba(8,6,14,0.9)" : null, shadow: null,
      });
    });
    const note = this.options[this.cursor]?.note ?? "";
    drawText(ctx, note, VIEW_WIDTH / 2, top + this.options.length * 22 + 8,
      { color: PALETTE.grassLight, align: "center" });
    drawText(ctx, "↑↓ choisir · X valider", VIEW_WIDTH / 2, VIEW_HEIGHT - 18,
      { color: PALETTE.stoneDark, align: "center" });
  }

  private drawControls(ctx: CanvasRenderingContext2D): void {
    const rows: readonly (readonly [string, string])[] = [
      ["Flèches / WASD", "marcher"],
      ["Espace", "épée — maintenir pour charger"],
      ["Maj", "esquive roulée, invincible"],
      ["X", "parler, fouiller, ouvrir"],
      ["C", "utiliser un remède"],
      ["F", "forme demi-démon"],
      ["Entrée", "sac, quêtes, carte"],
    ];
    ctx.fillStyle = "rgba(8,10,18,0.86)";
    ctx.fillRect(56, 88, VIEW_WIDTH - 112, 112);
    ctx.strokeStyle = PALETTE.sandLight;
    ctx.strokeRect(56.5, 88.5, VIEW_WIDTH - 113, 111);
    rows.forEach(([key, label], index) => {
      const y = 98 + index * 14;
      drawText(ctx, key, 68, y, { color: PALETTE.cream });
      drawText(ctx, label, 176, y, { color: PALETTE.grassLight });
    });
    drawText(ctx, "X pour revenir", VIEW_WIDTH / 2, 186, { color: PALETTE.stoneDark, align: "center" });
  }
}
