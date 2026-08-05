import { INTERACTABLES } from "../data/interactables";
import { NPCS } from "../data/npcs/core";
import { SIDE_ACTIVITIES } from "../data/sideActivities";
import { CAMPAIGN_TRIGGERS } from "../data/campaignTriggers";
import { WORLD_ZONES } from "../data/world";
import { ENEMY_SPAWNS } from "../data/enemies";
import type { ZoneCoord } from "../core/Camera";
import type { ActiveObjective } from "./Quest";

/**
 * Où aller.
 *
 * Le journal disait quoi faire, jamais où : « activez les trois Sceaux » ne
 * sert à rien quand la vallée compte quatre-vingt-dix régions. On résout ici
 * l'étape courante en une région, par recoupements successifs — l'objet du
 * monde qui la déclenche, le personnage à qui parler, la créature à abattre —
 * pour qu'une étoile puisse se poser sur la carte.
 */
export interface Waypoint {
  readonly zone: ZoneCoord;
  readonly label: string;
}

function zoneOf(zoneId: string): ZoneCoord | null {
  const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId);
  return zone ? { x: zone.x, y: zone.y } : null;
}

function nameOf(zoneId: string): string {
  return WORLD_ZONES.find((candidate) => candidate.id === zoneId)?.name ?? zoneId;
}

/** Objet du monde qui, une fois actionné, fait avancer cette étape. */
function objectForStep(type: string, target: string): string | null {
  // Une activité annexe nomme explicitement son déclencheur.
  const activity = SIDE_ACTIVITIES.find((candidate) =>
    candidate.event.type === type && candidate.event.target === target);
  if (activity) return activity.trigger;

  // Sinon, un déclencheur de campagne porte le même identifiant que l'objet.
  const trigger = CAMPAIGN_TRIGGERS.find((candidate) =>
    candidate.quest?.type === type && candidate.quest.target === target);
  if (trigger) return trigger.id;

  // Dernier recours : une étape « flag » dont un déclencheur pose le drapeau.
  if (type === "flag") {
    const byFlag = CAMPAIGN_TRIGGERS.find((candidate) => candidate.setFlags.includes(target));
    if (byFlag) return byFlag.id;
    const sideByFlag = SIDE_ACTIVITIES.find((candidate) => candidate.setFlags.includes(target));
    if (sideByFlag) return sideByFlag.trigger;
  }
  return null;
}

/** Région à rejoindre pour faire avancer l'objectif courant. */
export function waypointFor(objective: ActiveObjective | null): Waypoint | null {
  if (!objective) return null;
  const stepType = objective.type;
  const stepTarget = objective.target;

  if (stepType === "talkTo") {
    const npc = NPCS.find((candidate) => candidate.id === stepTarget);
    const home = npc?.schedule[0];
    if (home) {
      const zone = zoneOf(home.zone);
      if (zone) return { zone, label: `${npc!.name} · ${nameOf(home.zone)}` };
    }
  }

  const objectId = objectForStep(stepType, stepTarget);
  if (objectId) {
    const object = INTERACTABLES.find((candidate) => candidate.id === objectId);
    if (object) {
      const zone = zoneOf(object.zone);
      if (zone) return { zone, label: nameOf(object.zone) };
    }
    // Certains déclencheurs ne sont pas des objets mais des répliques : leur
    // identifiant commence alors par celui du personnage — « bram_sword ».
    const speaker = NPCS.find((candidate) => objectId.startsWith(`${candidate.id}_`));
    const home = speaker?.schedule[0];
    if (home) {
      const zone = zoneOf(home.zone);
      if (zone) return { zone, label: `${speaker!.name} · ${nameOf(home.zone)}` };
    }
  }

  if (stepType === "defeat") {
    const spawn = ENEMY_SPAWNS.find((candidate) => candidate.type === stepTarget);
    if (spawn) {
      const zone = zoneOf(spawn.zone);
      if (zone) return { zone, label: nameOf(spawn.zone) };
    }
    const scripted = SCRIPTED_LAIRS[stepTarget];
    if (scripted) {
      const zone = zoneOf(scripted);
      if (zone) return { zone, label: nameOf(scripted) };
    }
  }

  return null;
}

/** Repaires que le peuplement automatique ne peut pas désigner. */
const SCRIPTED_LAIRS: Readonly<Record<string, string>> = {
  mother_tree: "boss_arena",
  green_knight: "vertepierre",
  dragon: "caldeira",
};
