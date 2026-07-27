import { describe, expect, it } from "vitest";
import { findPath } from "../world/Pathfinding";
import { Affinity } from "../systems/Affinity";

describe("PNJ", () => {
  it("trouve un chemin déterministe autour d'un obstacle", () => {
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, (x, y) => !(x === 1 && y === 0), 4, 4);
    expect(path.at(-1)).toEqual({ x: 2, y: 0 });
    expect(path).toHaveLength(5);
  });

  it("déclenche les paliers d'affinité une fois", () => {
    const affinity = new Affinity();
    expect(affinity.add("iris", 3)).toEqual([3]);
    expect(affinity.add("iris", 1)).toEqual([]);
    expect(affinity.add("iris", 5)).toEqual([6, 9]);
  });
});
