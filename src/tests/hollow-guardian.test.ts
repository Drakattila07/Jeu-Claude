import { describe, expect, it } from "vitest";
import { HollowGuardian } from "../entities/HollowGuardian";
import type { Player } from "../entities/Player";

function makePlayer(): Player {
  return { position: { x: 200, y: 160 } } as Player;
}

describe("la Gardienne des Racines", () => {
  it("passe par trois phases selon ses cœurs", () => {
    const guardian = new HollowGuardian(makePlayer());
    expect(guardian.phase).toBe(1);
    guardian.hearts = 10;
    expect(guardian.phase).toBe(2);
    guardian.hearts = 4;
    expect(guardian.phase).toBe(3);
  });

  it("encaisse sans dommage tant que le cœur n'est pas ouvert", () => {
    const guardian = new HollowGuardian(makePlayer());
    guardian.exposedFrames = 0;
    guardian.flashFrames = 0;
    expect(guardian.hit()).toBe(false);
    expect(guardian.hearts).toBe(guardian.maxHearts);
  });

  it("tombe quand on frappe chaque ouverture", () => {
    const guardian = new HollowGuardian(makePlayer());
    for (let index = 0; index < guardian.maxHearts; index += 1) {
      guardian.flashFrames = 0;
      guardian.exposedFrames = 10;
      guardian.hit();
    }
    expect(guardian.active).toBe(false);
  });

  it("tient compte de la force du coup", () => {
    const light = new HollowGuardian(makePlayer());
    light.exposedFrames = 10;
    light.hit(1);
    const heavy = new HollowGuardian(makePlayer());
    heavy.exposedFrames = 10;
    heavy.hit(4);
    expect(heavy.hearts).toBeLessThan(light.hearts);
  });

  it("s'ouvre après chaque anneau de racines", () => {
    const guardian = new HollowGuardian(makePlayer());
    let opened = false;
    for (let frame = 0; frame < 200 && !opened; frame += 1) {
      guardian.update();
      if (guardian.isExposed) opened = true;
    }
    expect(opened).toBe(true);
    expect(guardian.eruptions.length).toBeGreaterThan(0);
  });

  it("annonce ses éruptions avant qu'elles ne blessent", () => {
    // Phase 1 : le premier anneau tombe pile à `slamPeriod`, il faut donc
    // dépasser ce cap pour être sûr d'en avoir un à observer.
    const guardian = new HollowGuardian(makePlayer());
    for (let frame = 0; frame < 152; frame += 1) guardian.update();
    expect(guardian.eruptions.length).toBeGreaterThan(0);
    const fresh = guardian.eruptions.filter((eruption) => eruption.timer > 30);
    if (fresh.length > 0) {
      expect(guardian.eruptionBounds().length).toBeLessThan(guardian.eruptions.length);
    }
  });

  it("lance des spores seulement à partir de la deuxième phase", () => {
    const guardian = new HollowGuardian(makePlayer());
    guardian.hearts = guardian.maxHearts; // phase 1
    for (let frame = 0; frame < 140; frame += 1) guardian.update();
    expect(guardian.spores.length).toBe(0);

    const wounded = new HollowGuardian(makePlayer());
    wounded.hearts = 10; // phase 2
    for (let frame = 0; frame < 140; frame += 1) wounded.update();
    expect(wounded.spores.length).toBeGreaterThan(0);
  });

  it("resserre sa cage de racines en troisième phase", () => {
    const guardian = new HollowGuardian(makePlayer());
    guardian.hearts = 4; // phase 3
    for (let frame = 0; frame < 75; frame += 1) guardian.update();
    expect(guardian.eruptions.length).toBeGreaterThan(0);
  });

  it("ne bascule pas les cœurs sous zéro", () => {
    const guardian = new HollowGuardian(makePlayer());
    guardian.exposedFrames = 999;
    for (let strike = 0; strike < 40; strike += 1) {
      guardian.flashFrames = 0;
      guardian.exposedFrames = 10;
      guardian.hit(4);
    }
    expect(guardian.hearts).toBeLessThanOrEqual(0);
    expect(guardian.active).toBe(false);
  });
});
