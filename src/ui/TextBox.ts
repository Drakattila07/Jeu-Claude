import { drawNineSlice } from "./NineSlice";
import { PALETTE } from "../data/palette";
import type { Input } from "../core/Input";
import { VIEW_HEIGHT, VIEW_WIDTH, type Renderer } from "../core/Renderer";
import { drawText, measureText, wrapText, LINE_HEIGHT } from "./Font";

const BOX_MARGIN = 14;
const BOX_HEIGHT = 62;
const PORTRAIT_SIZE = 40;
const LINES_PER_PAGE = 3;

/**
 * Découpe un texte en pages, en caractères.
 *
 * Conservée pour les appels historiques qui raisonnent ainsi ; la boîte de
 * dialogue, elle, mesure désormais en pixels via la police bitmap, ce qui
 * évite les lignes qui débordaient dès qu'un mot était large.
 */
export function paginateText(text: string, lineLength = 18, linesPerPage = 3): readonly string[][] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const pieces = word.length <= lineLength
      ? [word]
      : word.match(new RegExp(`.{1,${lineLength}}`, "g")) ?? [word];
    for (const piece of pieces) {
      if (!line) line = piece;
      else if (`${line} ${piece}`.length <= lineLength) line += ` ${piece}`;
      else { lines.push(line); line = piece; }
    }
  }
  if (line) lines.push(line);
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }
  return pages.length > 0 ? pages : [["…"]];
}

/** Découpe en pages à la largeur réelle du cadre. */
export function paginatePixels(text: string, maxWidth: number,
  linesPerPage = LINES_PER_PAGE): readonly string[][] {
  const lines = wrapText(text.trim(), maxWidth);
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push([...lines.slice(index, index + linesPerPage)]);
  }
  return pages.length > 0 ? pages : [["…"]];
}

export class TextBox {
  active = false;
  private pages: readonly string[][] = [];
  private page = 0;
  private visibleCharacters = 0;
  private frame = 0;
  private speaker = "";
  private portrait: string | null = null;
  private beep: () => void = () => undefined;

  setBeep(callback: () => void): void { this.beep = callback; }

  close(): void {
    this.active = false;
    this.pages = [];
    this.page = 0;
    this.visibleCharacters = 0;
  }

  open(text: string, speaker = "", portrait: string | null = null): void {
    const width = VIEW_WIDTH - BOX_MARGIN * 2 - 26 - (portrait ? PORTRAIT_SIZE + 10 : 0);
    this.pages = paginatePixels(text, width);
    this.page = 0;
    this.visibleCharacters = 0;
    this.frame = 0;
    this.speaker = speaker;
    this.portrait = portrait;
    this.active = true;
  }

  update(input: Input): void {
    if (!this.active) return;
    this.frame += 1;
    const target = this.pages[this.page]?.join("\n").length ?? 0;
    if (this.visibleCharacters < target) {
      const rate = input.isDown("A") ? 1 : 2;
      if (this.frame % rate === 0) {
        this.visibleCharacters += 1;
        if (this.visibleCharacters % 3 === 0) this.beep();
      }
      if (input.wasPressed("A")) this.visibleCharacters = target;
      return;
    }
    if (input.wasPressed("A") || input.wasPressed("Attack")) {
      if (this.page < this.pages.length - 1) {
        this.page += 1;
        this.visibleCharacters = 0;
        this.frame = 0;
      } else this.active = false;
    }
  }

  draw(renderer: Renderer): void {
    if (!this.active) return;
    const { ctx } = renderer;
    const top = VIEW_HEIGHT - BOX_HEIGHT - 10;
    const width = VIEW_WIDTH - BOX_MARGIN * 2;

    ctx.save();
    drawNineSlice(ctx, BOX_MARGIN, top, width, BOX_HEIGHT, "dark");

    let textX = BOX_MARGIN + 12;
    if (this.portrait) {
      this.drawPortrait(ctx, BOX_MARGIN + 8, top + 11);
      textX = BOX_MARGIN + PORTRAIT_SIZE + 18;
    }

    if (this.speaker) {
      const label = this.speaker.toUpperCase();
      const labelWidth = measureText(label) + 12;
      ctx.fillStyle = PALETTE.pineDark;
      ctx.fillRect(BOX_MARGIN + 8, top - 7, labelWidth, 13);
      ctx.fillStyle = PALETTE.sandLight;
      ctx.fillRect(BOX_MARGIN + 8, top - 7, labelWidth, 1);
      drawText(ctx, label, BOX_MARGIN + 14, top - 6, { color: PALETTE.grassLight });
    }

    const full = this.pages[this.page]?.join("\n") ?? "";
    const visible = full.slice(0, this.visibleCharacters);
    visible.split("\n").forEach((line, index) => {
      drawText(ctx, line, textX, top + 11 + index * LINE_HEIGHT, { color: PALETTE.cream });
    });

    if (this.visibleCharacters >= full.length) {
      const bob = Math.floor(this.frame / 16) % 2;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(BOX_MARGIN + width - 16, top + BOX_HEIGHT - 13 + bob, 6, 2);
      ctx.fillRect(BOX_MARGIN + width - 15, top + BOX_HEIGHT - 11 + bob, 4, 2);
      ctx.fillRect(BOX_MARGIN + width - 14, top + BOX_HEIGHT - 9 + bob, 2, 2);
    }
    if (this.pages.length > 1) {
      drawText(ctx, `${this.page + 1}/${this.pages.length}`,
        BOX_MARGIN + width - 12, top + 4, { color: PALETTE.stoneDark, align: "right" });
    }
    ctx.restore();
  }

  /**
   * Portrait dérivé de l'identifiant du personnage : deux teintes tirées du
   * nom suffisent à donner un visage reconnaissable, et surtout stable d'une
   * réplique à l'autre.
   */
  private drawPortrait(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const seed = [...(this.portrait ?? "")]
      .reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
    const skins = [PALETTE.sandLight, PALETTE.sand, PALETTE.woodLight, PALETTE.cream];
    const cloths = [PALETTE.roof, PALETTE.leaf, PALETTE.water, PALETTE.purple, PALETTE.sand, PALETTE.stone];
    const skin = skins[seed % skins.length]!;
    const cloth = cloths[(seed >> 3) % cloths.length]!;

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x, y, PORTRAIT_SIZE, PORTRAIT_SIZE);
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(x + 1, y + 1, PORTRAIT_SIZE - 2, PORTRAIT_SIZE - 2);
    ctx.fillStyle = cloth;
    ctx.fillRect(x + 6, y + 26, 28, 14);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 9, y + 6, 22, 24);
    ctx.fillStyle = skin;
    ctx.fillRect(x + 10, y + 8, 20, 21);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 8, y + 4, 24, 8);
    ctx.fillRect(x + 8, y + 4, 4, 18);
    if ((seed & 1) === 0) ctx.fillRect(x + 28, y + 4, 4, 18);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 14, y + 16, 3, 3);
    ctx.fillRect(x + 23, y + 16, 3, 3);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x + 15, y + 16, 1, 1);
    ctx.fillRect(x + 24, y + 16, 1, 1);
    ctx.fillStyle = PALETTE.roofDark;
    ctx.fillRect(x + 17, y + 23, 6, 1);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(x, y, PORTRAIT_SIZE, 1);
    ctx.fillRect(x, y + PORTRAIT_SIZE - 1, PORTRAIT_SIZE, 1);
    ctx.fillRect(x, y, 1, PORTRAIT_SIZE);
    ctx.fillRect(x + PORTRAIT_SIZE - 1, y, 1, PORTRAIT_SIZE);
  }
}
