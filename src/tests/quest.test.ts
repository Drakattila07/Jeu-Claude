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

  it("expose clairement l'étape et la progression de chaque quête active", () => {
    const flags = new Flags();
    const quests = new QuestSystem(flags, new EventBus(), [{
      id: "lisible", title: "Une quête lisible", giver: "garde", prerequisites: [],
      steps: [{ id: "loups", type: "defeat", target: "wolf", count: 3, hint: "Éloignez les loups." }],
      rewards: [], worldEffects: [],
    }]);
    quests.refresh();
    quests.notify("defeat", "wolf", 1);
    expect(quests.activeObjectives()).toEqual([{
      id: "lisible", title: "Une quête lisible", hint: "Éloignez les loups.",
      // L'étape porte sa nature et sa cible : c'est ce qui permet de retrouver
      // la région à rejoindre et d'y poser l'étoile de la carte.
      type: "defeat", target: "wolf",
      step: 1, stepCount: 1, progress: 1, targetCount: 3,
    }]);
  });

  it("publie les primes en rubis au lieu de les perdre", () => {
    const events = new EventBus();
    const received: number[] = [];
    events.subscribe((event) => {
      if (event.type === "quest_reward" && event.payload?.reward === "rupees") {
        received.push(Number(event.payload.amount));
      }
    });
    const quests = new QuestSystem(new Flags(), events, [{
      id: "prime", title: "Prime", giver: "garde", prerequisites: [],
      steps: [{ id: "loups", type: "defeat", target: "wolf", count: 1, hint: "Un loup." }],
      rewards: [{ type: "flag", id: "fait" }, { type: "rupees", id: "prime", amount: 120 }],
      worldEffects: [],
    }]);
    quests.refresh();
    quests.notify("defeat", "wolf", 1);
    expect(received).toEqual([120]);
  });

  it("ne garde que dix événements récents", () => {
    const events = new EventBus();
    for (let index = 0; index < 12; index += 1) events.publish({ type: "x", id: String(index), frame: index });
    expect(events.history()).toHaveLength(10);
    expect(events.history()[0]?.id).toBe("2");
  });
});
