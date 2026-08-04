import { describe, expect, it } from "vitest";
import { MotherTreeBoss } from "../entities/Boss";
import type { Player } from "../entities/Player";

function makePlayer(): Player {
  return { position: { x: 240, y: 320 } } as Player;
}

describe("Arbre-Mère", () => {
  it("passe par trois phases selon ses cœurs", () => {
    const boss = new MotherTreeBoss(makePlayer());
    expect(boss.phase).toBe(1);
    boss.hearts = 12;
    expect(boss.phase).toBe(2);
    boss.hearts = 5;
    expect(boss.phase).toBe(3);
  });

  it("encaisse sans dommage tant que son écorce est fermée", () => {
    // Le combat se gagnait en martelant sans réfléchir : elle refuse
    // désormais les coups portés hors de sa fenêtre de faiblesse.
    const boss = new MotherTreeBoss(makePlayer());
    boss.exposedFrames = 0;
    boss.flashFrames = 0;
    expect(boss.hit()).toBe(false);
    expect(boss.hearts).toBe(boss.maxHearts);
  });

  it("tombe quand on frappe chacune de ses ouvertures", () => {
    const boss = new MotherTreeBoss(makePlayer());
    for (let index = 0; index < boss.maxHearts; index += 1) {
      boss.flashFrames = 0;
      boss.exposedFrames = 10;
      boss.hit();
    }
    expect(boss.active).toBe(false);
  });

  it("ouvre son écorce après chaque salve", () => {
    const boss = new MotherTreeBoss(makePlayer());
    let opened = false;
    for (let frame = 0; frame < 200 && !opened; frame += 1) {
      boss.update();
      if (boss.isExposed) opened = true;
    }
    expect(opened).toBe(true);
    expect(boss.seeds.length).toBeGreaterThan(0);
  });

  it("annonce ses racines avant qu'elles ne blessent", () => {
    const boss = new MotherTreeBoss(makePlayer());
    boss.hearts = 4; // troisième phase
    for (let frame = 0; frame < 100; frame += 1) boss.update();
    expect(boss.spikes.length).toBeGreaterThan(0);
    // Une racine qui vient de percer ne touche pas encore.
    const fresh = boss.spikes.filter((spike) => spike.timer > 26);
    if (fresh.length > 0) expect(boss.spikeBounds().length).toBeLessThan(boss.spikes.length);
  });
});
