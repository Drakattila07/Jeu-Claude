import { describe, expect, it } from "vitest";
import { npcActivityFor } from "../entities/Npc";

describe("routines visuelles des PNJ", () => {
  it("fait balayer les habitants assignés à intervalles réguliers", () => {
    expect(npcActivityFor("doyen_orme", 80)).toBe("walk");
    expect(npcActivityFor("doyen_orme", 200)).toBe("sweep");
    expect(npcActivityFor("fermier_a", 250)).toBe("sweep");
  });

  it("fait jouer les jumeaux au ballon continuellement", () => {
    expect(npcActivityFor("ryn", 0)).toBe("ball");
    expect(npcActivityFor("tam", 999)).toBe("ball");
  });
});
