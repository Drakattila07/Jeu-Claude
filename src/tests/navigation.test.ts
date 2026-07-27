import { describe, expect, it } from "vitest";
import { Camera, type Edge } from "../core/Camera";
import { ZoneRegistry } from "../world/Zone";

describe("navigation par écran", () => {
  it("boucle sur quatre zones adjacentes", () => {
    const camera = new Camera({ x: 3, y: 3 });
    const registry = new ZoneRegistry();
    const route: readonly Edge[] = ["west", "south", "east", "north"];
    for (const edge of route) {
      const destination = camera.adjacent(edge);
      expect(registry.canEnter(destination)).toBe(true);
      camera.zone = destination;
    }
    expect(camera.zone).toEqual({ x: 3, y: 3 });
  });
});
