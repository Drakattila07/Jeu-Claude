import { describe, expect, it } from "vitest";
import { collides, moveOnGrid, resolveOverlap } from "../world/Collision";

const box = { x: 0, y: 0, width: 10, height: 10 };
const solid = (x: number, y: number): boolean => x === 1 && y === 1;

describe("collisions grille", () => {
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

  it("laisse repartir un corps déjà encastré", () => {
    // C'était le bug fatal : chaque candidat touchait le même mur, donc tout
    // était refusé, et le personnage restait figé pour de bon.
    const inside = { x: 18, y: 18 };
    expect(collides(inside, box, solid)).toBe(true);
    const moved = moveOnGrid(inside, { x: 2, y: 0 }, box, solid);
    expect(moved.x).toBeGreaterThan(inside.x);
  });
});

describe("dégagement d'une position bloquée", () => {
  const wall = (x: number, y: number): boolean => x >= 2 && x <= 4 && y >= 2 && y <= 4;

  it("ne bouge pas une position déjà libre", () => {
    const free = { x: 100, y: 100 };
    expect(resolveOverlap(free, box, wall)).toEqual(free);
  });

  it("ramène une position encastrée sur une case praticable", () => {
    const stuck = { x: 3 * 16, y: 3 * 16 };
    expect(collides(stuck, box, wall)).toBe(true);
    const freed = resolveOverlap(stuck, box, wall);
    expect(collides(freed, box, wall)).toBe(false);
  });

  it("reste dans les limites de la carte quand on les lui donne", () => {
    const bounds = { width: 512, height: 448 };
    const stuck = { x: 3 * 16, y: 3 * 16 };
    const freed = resolveOverlap(stuck, box, wall, bounds);
    expect(freed.x).toBeGreaterThanOrEqual(0);
    expect(freed.y).toBeGreaterThanOrEqual(0);
    expect(freed.x + box.width).toBeLessThanOrEqual(bounds.width);
    expect(freed.y + box.height).toBeLessThanOrEqual(bounds.height);
  });

  it("est déterministe : deux appels donnent le même dégagement", () => {
    const stuck = { x: 3 * 16, y: 3 * 16 };
    expect(resolveOverlap(stuck, box, wall)).toEqual(resolveOverlap(stuck, box, wall));
  });
});
