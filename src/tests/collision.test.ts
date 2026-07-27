import { describe, expect, it } from "vitest";
import { moveOnGrid } from "../world/Collision";

describe("collisions grille", () => {
  const box = { x: 0, y: 0, width: 10, height: 10 };
  const solid = (x: number, y: number): boolean => x === 1 && y === 1;

  it("corrige un contact de coin inférieur ou égal à 4 px", () => {
    const moved = moveOnGrid({ x: 5, y: 7 }, { x: 2, y: 0 }, box, solid, 4);
    expect(moved.x).toBe(7);
    expect(moved.y).toBeLessThan(7);
  });

  it("reste déterministe pour une suite de mouvements", () => {
    const run = (): string => {
      let position = { x: 0, y: 0 };
      for (let frame = 0; frame < 120; frame += 1) {
        position = moveOnGrid(position, { x: 1.5, y: frame % 2 ? 0.5 : 0 }, box, solid);
      }
      return JSON.stringify(position);
    };
    expect(run()).toBe(run());
  });
});
