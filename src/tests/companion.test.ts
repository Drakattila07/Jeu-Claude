import { describe, expect, it } from "vitest";
import { Companion, COMPANION_COOLDOWN } from "../entities/Companion";

describe("Liane", () => {
  it("erre autour de son point d'apparition tant qu'elle ne suit pas", () => {
    const liane = new Companion({ x: 100, y: 100 });
    expect(liane.isFollowing).toBe(false);
    for (let frame = 0; frame < 10; frame += 1) liane.update();
    expect(Math.hypot(liane.position.x - 100, liane.position.y - 100)).toBeLessThan(20);
  });

  it("suit le joueur une fois libérée, sans jamais s'arrêter de le faire", () => {
    const liane = new Companion({ x: 0, y: 0 });
    const target = { x: 200, y: 40 };
    liane.follow(target);
    expect(liane.isFollowing).toBe(true);
    for (let frame = 0; frame < 200; frame += 1) liane.update();
    // Elle rattrape la position visée, à l'offset et au balancement près.
    expect(Math.abs(liane.position.x - (target.x + 24))).toBeLessThan(8);
  });

  it("attend son plein temps de recharge entre deux ronces", () => {
    const liane = new Companion({ x: 0, y: 0 });
    expect(liane.ready).toBe(true);
    expect(liane.spark()).toBe(true);
    expect(liane.ready).toBe(false);
    expect(liane.spark()).toBe(false);
    for (let frame = 0; frame < COMPANION_COOLDOWN - 1; frame += 1) liane.update();
    expect(liane.ready).toBe(false);
    liane.update();
    expect(liane.ready).toBe(true);
  });

  it("fait tourner son bavardage sans jamais répéter deux fois de suite le même texte", () => {
    const liane = new Companion({ x: 0, y: 0 });
    const first = liane.nextBanter();
    const second = liane.nextBanter();
    expect(first).not.toBe(second);
  });

  it("mesure correctement sa distance au joueur", () => {
    const liane = new Companion({ x: 0, y: 0 });
    expect(liane.distanceTo({ x: 3, y: 4 })).toBe(5);
  });
});
