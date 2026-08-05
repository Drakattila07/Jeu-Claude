import { describe, expect, it } from "vitest";
import { SIDE_ACTIVITIES } from "../data/sideActivities";
import { Fishing } from "../systems/Fishing";

describe("quêtes secondaires et pêche", () => {
  it("donne un identifiant unique à chaque activité annexe", () => {
    // Compter les activités figeait le contenu : ajouter une quête cassait un
    // test qui ne parlait pas d'elle. Seule l'unicité compte ici.
    expect(SIDE_ACTIVITIES.length).toBeGreaterThan(10);
    expect(new Set(SIDE_ACTIVITIES.map((activity) => activity.id)).size)
      .toBe(SIDE_ACTIVITIES.length);
    expect(new Set(SIDE_ACTIVITIES.map((activity) => activity.trigger)).size)
      .toBe(SIDE_ACTIVITIES.length);
  });

  it("choisit le même timing de morsure pour le même jour", () => {
    const a = new Fishing();
    const b = new Fishing();
    a.start(4);
    b.start(4);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
