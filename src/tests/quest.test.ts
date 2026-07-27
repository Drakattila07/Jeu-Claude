import { describe, expect, it } from "vitest";
import { EventBus } from "../core/EventBus";
import { Flags } from "../systems/Flags";
import { QuestSystem } from "../systems/Quest";

describe("quêtes et mémoire", () => {
  it("avance une quête depuis les données et applique ses effets", () => {
    const flags = new Flags();
    const events = new EventBus();
    const quests = new QuestSystem(flags, events, [{
      id: "test", title: "Test", giver: "x", prerequisites: [],
      steps: [{ id: "one", type: "collect", target: "root", count: 2, hint: "Deux racines." }],
      rewards: [{ type: "flag", id: "won" }], worldEffects: ["water"]
    }]);
    quests.refresh();
    quests.notify("collect", "root", 1);
    quests.notify("collect", "root", 2);
    expect(flags.has("won")).toBe(true);
    expect(flags.has("water")).toBe(true);
  });

  it("ne garde que dix événements récents", () => {
    const events = new EventBus();
    for (let index = 0; index < 12; index += 1) events.publish({ type: "x", id: String(index), frame: index });
    expect(events.history()).toHaveLength(10);
    expect(events.history()[0]?.id).toBe("2");
  });
});
