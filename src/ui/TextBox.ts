import { PALETTE } from "../data/palette";
import type { Input } from "../core/Input";
import type { Renderer } from "../core/Renderer";

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

export class TextBox {
  active = false;
  private pages: readonly string[][] = [];
  private page = 0;
  private visibleCharacters = 0;
  private frame = 0;
  private speaker = "";
  private beep: () => void = () => undefined;

  setBeep(callback: () => void): void { this.beep = callback; }

  open(text: string, speaker = ""): void {
    this.pages = paginateText(text);
    this.page = 0;
    this.visibleCharacters = 0;
    this.frame = 0;
    this.speaker = speaker;
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
        if (this.visibleCharacters % 4 === 0) this.beep();
      }
      if (input.wasPressed("A")) this.visibleCharacters = target;
      return;
    }
    if (input.wasPressed("A")) {
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
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(8, 166, 240, 51);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(9, 167, 238, 2);
    ctx.fillRect(9, 214, 238, 2);
    ctx.fillRect(9, 167, 2, 49);
    ctx.fillRect(245, 167, 2, 49);
    if (this.speaker) {
      ctx.fillStyle = PALETTE.pineDark;
      ctx.fillRect(14, 161, this.speaker.length * 6 + 8, 10);
      renderer.pixelText(this.speaker.toUpperCase(), 18, 161, PALETTE.grassLight);
    }
    const full = this.pages[this.page]?.join("\n") ?? "";
    const visible = full.slice(0, this.visibleCharacters);
    visible.split("\n").forEach((line, index) => {
      renderer.pixelText(line, 18, 176 + index * 12, PALETTE.cream);
    });
    if (this.visibleCharacters >= full.length) {
      renderer.pixelText("▼", 235, 203, PALETTE.yellow);
    }
  }
}
