import { describe, expect, it } from "vitest";
import { waypointFor } from "../systems/Waypoint";
import { QuestSystem } from "../systems/Quest";
import { Flags } from "../systems/Flags";
import { EventBus } from "../core/EventBus";
import { QUESTS } from "../data/quests/core";
import { WORLD_ZONES } from "../data/world";

function objectivesFrom(flags: readonly string[]) {
  const store = new Flags();
  for (const flag of flags) store.set(flag);
  const quests = new QuestSystem(store, new EventBus(), QUESTS);
  quests.refresh();
  return quests.activeObjectives(12);
}

describe("étoile de destination", () => {
  it("désigne une région qui existe pour l'objectif de départ", () => {
    const objective = objectivesFrom([])[0]!;
    const waypoint = waypointFor(objective);
    expect(waypoint).not.toBeNull();
    const zone = WORLD_ZONES.find((candidate) =>
      candidate.x === waypoint!.zone.x && candidate.y === waypoint!.zone.y);
    expect(zone).toBeDefined();
    expect(waypoint!.label.length).toBeGreaterThan(0);
  });

  it("place le repère chez le personnage à qui parler", () => {
    // « Rapportez la canne à Nessa » doit pointer le Quai du Lac, où elle vit.
    const objective = objectivesFrom(["act1_complete", "rod_found"])
      .find((candidate) => candidate.type === "talkTo" && candidate.target === "nessa");
    if (!objective) return;
    const waypoint = waypointFor(objective)!;
    const quai = WORLD_ZONES.find((zone) => zone.id === "quai_lac")!;
    expect(waypoint.zone).toEqual({ x: quai.x, y: quai.y });
  });

  it("place le repère au repaire des gardiens", () => {
    const dragon = { id: "q", title: "t", hint: "h", type: "defeat" as const, target: "dragon",
      step: 1, stepCount: 1, progress: 0, targetCount: 1 };
    const caldeira = WORLD_ZONES.find((zone) => zone.id === "caldeira")!;
    expect(waypointFor(dragon)!.zone).toEqual({ x: caldeira.x, y: caldeira.y });

    const knight = { ...dragon, target: "green_knight" };
    const vertepierre = WORLD_ZONES.find((zone) => zone.id === "vertepierre")!;
    expect(waypointFor(knight)!.zone).toEqual({ x: vertepierre.x, y: vertepierre.y });
  });

  it("résout une région pour la plupart des étapes du jeu", () => {
    // Un objectif sans repère renvoie le joueur à la recherche au hasard sur
    // quatre-vingt-dix régions : on veut que ce cas reste marginal.
    const every = QUESTS.flatMap((quest) => quest.steps.map((step) => ({
      id: quest.id, title: quest.title, hint: step.hint,
      type: step.type, target: step.target,
      step: 1, stepCount: quest.steps.length, progress: 0, targetCount: 1,
    })));
    const resolved = every.filter((objective) => waypointFor(objective) !== null);
    expect(resolved.length / every.length).toBeGreaterThan(0.7);
  });

  it("ne renvoie rien sans objectif", () => {
    expect(waypointFor(null)).toBeNull();
  });
});
