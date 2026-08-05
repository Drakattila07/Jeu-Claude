import { describe, expect, it } from "vitest";
import { ENEMY_TYPES, NIGHT_GUARDIANS, nightGuardianFor } from "../data/enemies";
import { CAMPAIGN_TRIGGERS } from "../data/campaignTriggers";
import { QUESTS } from "../data/quests/core";
import { WORLD_ZONES } from "../data/world";
import { createZoneMap } from "../world/ZoneMapFactory";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";

const never = (): boolean => false;
const always = (): boolean => true;

describe("gardiens nocturnes", () => {
  it("n'existe qu'entre ses heures", () => {
    // Le cœur du problème signalé : « la nuit, rejoignez la clairière » sans
    // rien qui s'y produise. La créature doit être là la nuit, et seulement.
    const zone = NIGHT_GUARDIANS[0]!.zone;
    for (const hour of [22, 23, 0, 3, 5]) {
      expect(nightGuardianFor(zone, hour, never), `${hour} h`).not.toBeNull();
    }
    for (const hour of [6, 9, 13, 18, 21]) {
      expect(nightGuardianFor(zone, hour, never), `${hour} h`).toBeNull();
    }
  });

  it("ne revient plus une fois l'histoire avancée", () => {
    const zone = NIGHT_GUARDIANS[0]!.zone;
    expect(nightGuardianFor(zone, 23, always)).toBeNull();
  });

  it("ignore les régions qui n'en ont pas", () => {
    expect(nightGuardianFor("place_puits", 23, never)).toBeNull();
  });

  it("déclare une région, une créature et un déclencheur qui existent", () => {
    for (const guardian of NIGHT_GUARDIANS) {
      expect(WORLD_ZONES.some((zone) => zone.id === guardian.zone),
        `région ${guardian.zone}`).toBe(true);
      expect(guardian.type in ENEMY_TYPES, `créature ${guardian.type}`).toBe(true);
      const trigger = CAMPAIGN_TRIGGERS.find((entry) => entry.id === guardian.trigger);
      expect(trigger, `déclencheur ${guardian.trigger}`).toBeDefined();
      // Sa défaite doit poser le drapeau qui l'empêche de revenir, sinon on le
      // combattrait chaque nuit sans jamais rien débloquer.
      expect(trigger!.setFlags).toContain(guardian.until);
    }
  });

  it("apparaît sur une case praticable de sa région", () => {
    const tileSet = new TileSet();
    for (const guardian of NIGHT_GUARDIANS) {
      const zone = WORLD_ZONES.find((candidate) => candidate.id === guardian.zone)!;
      const map = new TileMap(createZoneMap(zone), tileSet);
      const tileX = Math.floor(guardian.x / 16);
      const tileY = Math.floor(guardian.y / 16);
      expect(map.isSolid(tileX, tileY), `${guardian.zone} : gardien dans le décor`).toBe(false);
    }
  });

  it("donne à l'étape sa plage horaire dans la consigne", () => {
    // Une consigne qui ne dit pas l'heure envoie le joueur au hasard.
    const quest = QUESTS.find((candidate) => candidate.id === "act2_marche_nuit")!;
    const step = quest.steps[0]!;
    expect(step.hint).toMatch(/22\s*h/);
    expect(step.hint.toLowerCase()).toContain("clairière");
  });
});
