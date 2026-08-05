import { describe, expect, it } from "vitest";
import { QUESTS, type QuestDefinition } from "../data/quests/core";
import { SIDE_ACTIVITIES } from "../data/sideActivities";
import { CAMPAIGN_TRIGGERS } from "../data/campaignTriggers";
import { INTERACTABLES } from "../data/interactables";
import { SHOP_STOCK } from "../data/shop";
import { WORLD_ZONES } from "../data/world";
import { NPCS } from "../data/npcs/core";

/** Déclencheurs résolus par du code de jeu plutôt que par un objet du monde. */
const CODE_TRIGGERS = new Set([
  "map_100",       // atteint automatiquement quand la carte est complète
  "merchant_debt", // payé au comptoir du Colporteur
]);

/** Vue élargie : `as const` masque les champs optionnels comme `count`. */
const quests: readonly QuestDefinition[] = QUESTS;
const worldObjectIds = new Set<string>(INTERACTABLES.map((entry) => entry.id));
const shopTriggers = new Set(SHOP_STOCK.flatMap((entry) => entry.trigger ? [entry.trigger] : []));
const zoneIds = new Set<string>(WORLD_ZONES.map((zone) => zone.id));

describe("atteignabilité des quêtes", () => {
  it("donne à chaque activité annexe un déclencheur réellement présent", () => {
    const orphans = SIDE_ACTIVITIES.filter((activity) =>
      !worldObjectIds.has(activity.trigger)
      && !shopTriggers.has(activity.trigger)
      && !CODE_TRIGGERS.has(activity.trigger));
    expect(orphans.map((activity) => activity.trigger)).toEqual([]);
  });

  it("place chaque objet du monde dans une zone qui existe", () => {
    const misplaced = INTERACTABLES.filter((entry) => !zoneIds.has(entry.zone));
    expect(misplaced.map((entry) => `${entry.id}@${entry.zone}`)).toEqual([]);
  });

  it("rend toutes les quêtes franchissables étape par étape", () => {
    // Sources capables de faire avancer une étape : campagne, activités
    // annexes, et les quelques notifications émises directement par le jeu.
    const advanceable = new Set<string>([
      "defeat:wolf", "collect:fish", "defeat:mother_tree", "choice:ending",
      "talkTo:nessa",
      // Gardiens vaincus : le moteur notifie leur défaite comme celle de
      // n'importe quelle créature, par le type de la créature.
      "defeat:green_knight", "defeat:dragon",
    ]);
    for (const trigger of CAMPAIGN_TRIGGERS) {
      if (trigger.quest) advanceable.add(`${trigger.quest.type}:${trigger.quest.target}`);
      for (const flag of trigger.setFlags) advanceable.add(`flag:${flag}`);
    }
    for (const activity of SIDE_ACTIVITIES) {
      advanceable.add(`${activity.event.type}:${activity.event.target}`);
      for (const flag of activity.setFlags) advanceable.add(`flag:${flag}`);
    }
    // Drapeaux posés par le moteur lui-même.
    for (const flag of ["half_demon_skull", "boss_defeated", "lantern", "village_alarm"]) {
      advanceable.add(`flag:${flag}`);
    }

    const blocked = quests.flatMap((quest) =>
      quest.steps
        .filter((step) => !advanceable.has(`${step.type}:${step.target}`))
        .map((step) => `${quest.id}/${step.id} (${step.type}:${step.target})`));
    expect(blocked).toEqual([]);
  });

  it("accorde assez d'unités pour boucler les étapes qui comptent", () => {
    // Une activité qui n'octroie pas le compte attendu bloque la quête même
    // une fois déclenchée — c'était le cas de la cartographie (44 pour 56).
    const shortfalls: string[] = [];
    for (const activity of SIDE_ACTIVITIES) {
      if (activity.event.type !== "collect") continue;
      const quest = quests.find((candidate) => candidate.id === activity.quest);
      const step = quest?.steps.find((candidate) => candidate.target === activity.event.target);
      if (!step) continue;
      const granted = activity.event.amount ?? 1;
      const needed = step.count ?? 1;
      if (granted < needed) shortfalls.push(`${activity.id}: ${granted}/${needed}`);
    }
    expect(shortfalls).toEqual([]);
  });

  it("fait référence à des donneurs de quête connus", () => {
    const known = new Set<string>([...NPCS.map((npc) => npc.id),
      "auto", "objet", "environnement", "ryn_tam"]);
    const unknown = quests.filter((quest) => !known.has(quest.giver));
    expect(unknown.map((quest) => `${quest.id}←${quest.giver}`)).toEqual([]);
  });
});
