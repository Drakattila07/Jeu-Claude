import { describe, expect, it } from "vitest";
import { SIDE_ACTIVITIES } from "../data/sideActivities";
import { Fishing } from "../systems/Fishing";

describe("quêtes secondaires et pêche", () => {
  it("déclare les douze activités sans identifiant dupliqué", () => {
    expect(SIDE_ACTIVITIES).toHaveLength(12);
    expect(new Set(SIDE_ACTIVITIES.map((activity) => activity.id)).size).toBe(12);
  });

  it("choisit le même timing de morsure pour le même jour", () => {
    const a = new Fishing();
    const b = new Fishing();
    a.start(4);
    b.start(4);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
