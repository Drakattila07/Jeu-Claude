import { HINT_TARGETS } from "../data/hints";
import type { ZoneCoord } from "../core/Camera";
import type { Flags } from "./Flags";
import type { QuestSystem } from "./Quest";

export class HintSystem {
  constructor(private readonly flags: Flags, private readonly quests: QuestSystem) {}

  hint(from: ZoneCoord): string {
    const target = HINT_TARGETS
      .filter((candidate) => !this.flags.has(candidate.flag))
      .sort((a, b) => Math.abs(a.x - from.x) + Math.abs(a.y - from.y)
        - Math.abs(b.x - from.x) - Math.abs(b.y - from.y))[0];
    const objective = this.quests.activeObjective();
    if (!target) return objective?.hint ?? "Sylve sourit : tous les secrets proches sont trouvés.";
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "l'est" : "l'ouest")
      : (dy > 0 ? "le sud" : "le nord");
    return `Sylve pointe vers ${direction}. Peut-être ${target.label}.`;
  }
}
