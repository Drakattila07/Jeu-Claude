import { describe, expect, it } from "vitest";
import { ENEMY_SPAWNS, ENEMY_TYPES } from "../data/enemies";

describe("danger dans la forêt", () => {
  it("répartit une meute de loups entre plusieurs zones", () => {
    const wolves = ENEMY_SPAWNS.filter((spawn) => spawn.type === "wolf");
    expect(wolves).toHaveLength(5);
    expect(new Set(wolves.map((wolf) => wolf.zone)).size).toBe(5);
    expect(ENEMY_TYPES.wolf.behavior).toBe("hunt");
  });
});
