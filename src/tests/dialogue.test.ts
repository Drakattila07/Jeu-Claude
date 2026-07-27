import { describe, expect, it } from "vitest";
import { paginateText } from "../ui/TextBox";
import { DialogueSystem } from "../systems/Dialogue";

describe("dialogues", () => {
  it("pagine à trois lignes de 18 caractères", () => {
    const pages = paginateText("Une phrase assez longue pour remplir plusieurs lignes et plusieurs pages.");
    expect(pages.every((page) => page.length <= 3)).toBe(true);
    expect(pages.flat().every((line) => line.length <= 18)).toBe(true);
  });

  it("retient la première condition vraie", () => {
    const system = new DialogueSystem();
    const line = system.resolve("elder_intro", { flags: new Set(), weather: "clear", hour: 10 });
    expect(line).toContain("puits");
  });
});
