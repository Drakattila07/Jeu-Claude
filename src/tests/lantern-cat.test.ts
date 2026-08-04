import { describe, expect, it } from "vitest";
import { LanternCat } from "../entities/LanternCat";

describe("Chat-Lanterne", () => {
  it("flotte autour de son point d'ancrage", () => {
    const cat = new LanternCat({ x: 100, y: 80 });
    const start = { ...cat.position };
    for (let frame = 0; frame < 50; frame += 1) cat.update();
    expect(Math.hypot(cat.position.x - start.x, cat.position.y - start.y)).toBeGreaterThan(10);
    expect(Math.abs(cat.position.x - 100)).toBeLessThanOrEqual(22);
    expect(Math.abs(cat.position.y - 80)).toBeLessThanOrEqual(9);
  });

  it("propose une première bénédiction puis un soin renouvelable", () => {
    const cat = new LanternCat({ x: 100, y: 80 });
    expect(cat.blessingMessage(false)).toContain("bénédiction");
    expect(cat.blessingMessage(true)).toContain("tous vos cœurs");
  });
});
