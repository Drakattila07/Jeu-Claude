import { describe, expect, it } from "vitest";
import { Clock } from "../core/Clock";
import { RNG } from "../core/RNG";

describe("temps et hasard", () => {
  it("reproduit les mêmes tirages avec la même seed", () => {
    const a = new RNG(42);
    const b = new RNG(42);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });

  it("fait repousser une ressource après le nombre de jours prévu", () => {
    const clock = new Clock(7);
    clock.harvest("apple_1");
    expect(clock.canHarvest("apple_1", 1)).toBe(false);
    for (let frame = 0; frame < 24 * 60 * 60; frame += 1) clock.update();
    expect(clock.canHarvest("apple_1", 1)).toBe(true);
  });
});
