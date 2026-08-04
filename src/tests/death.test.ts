import { describe, expect, it } from "vitest";
import { Death, FALL_FRAMES, rupeesAfterDeath, DEFAULT_CHECKPOINT } from "../systems/Death";

describe("mort et renaissance", () => {
  it("ne retire qu'un quart de la bourse", () => {
    expect(rupeesAfterDeath(100)).toBe(75);
    expect(rupeesAfterDeath(3)).toBe(2);
    expect(rupeesAfterDeath(0)).toBe(0);
  });

  it("enchaîne chute puis choix, sans se redéclencher en boucle", () => {
    const death = new Death();
    expect(death.active).toBe(false);
    expect(death.begin()).toBe(true);
    expect(death.begin()).toBe(false);
    expect(death.phase).toBe("falling");
    for (let frame = 0; frame < FALL_FRAMES; frame += 1) death.update();
    expect(death.phase).toBe("prompt");
    expect(death.canChoose).toBe(true);
    expect(death.count).toBe(1);
  });

  it("repart du puits par défaut puis du dernier puits touché", () => {
    const death = new Death();
    expect(death.respawnPoint).toEqual(DEFAULT_CHECKPOINT);
    death.setCheckpoint({ x: 5, y: 2 }, 64, 96);
    expect(death.respawnPoint).toEqual({ zone: { x: 5, y: 2 }, x: 64, y: 96 });
  });

  it("survit à une sauvegarde sans point de renaissance", () => {
    const death = new Death();
    death.restore(undefined);
    expect(death.respawnPoint).toEqual(DEFAULT_CHECKPOINT);
    death.setCheckpoint({ x: 1, y: 1 }, 32, 32);
    const saved = death.snapshot();
    const reloaded = new Death();
    reloaded.restore(saved);
    expect(reloaded.respawnPoint.zone).toEqual({ x: 1, y: 1 });
  });

  it("rend la main après résolution", () => {
    const death = new Death();
    death.begin();
    death.resolve();
    expect(death.active).toBe(false);
    expect(death.fade).toBe(0);
  });
});
