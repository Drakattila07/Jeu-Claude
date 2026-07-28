import { describe, expect, it } from "vitest";
import { MotherTreeBoss } from "../entities/Boss";
import type { Player } from "../entities/Player";

describe("Arbre-Mère", () => {
  const player = { position: { x: 120, y: 160 } } as Player;
  it("passe par trois phases selon ses cœurs", () => {
    const boss = new MotherTreeBoss(player);
    expect(boss.phase).toBe(1);
    boss.hearts = 10;
    expect(boss.phase).toBe(2);
    boss.hearts = 5;
    expect(boss.phase).toBe(3);
  });

  it("tombe après dix-huit impacts espacés", () => {
    const boss = new MotherTreeBoss(player);
    for (let index = 0; index < 18; index += 1) {
      boss.flashFrames = 0;
      boss.hit();
    }
    expect(boss.active).toBe(false);
  });
});
