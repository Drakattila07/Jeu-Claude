import { SIDE_ACTIVITIES } from "../data/sideActivities";
import type { Flags } from "./Flags";
import type { QuestSystem } from "./Quest";

export class SideActivities {
  constructor(private readonly flags: Flags, private readonly quests: QuestSystem) {}

  trigger(triggerId: string, frame: number): string | null {
    const data = SIDE_ACTIVITIES.find((candidate) => candidate.trigger === triggerId);
    if (!data || this.flags.has(`side:${data.id}`)) return null;
    this.flags.set(`side:${data.id}`);
    for (const flag of data.setFlags) this.flags.set(flag);
    this.quests.notify(data.event.type, data.event.target, frame, data.event.amount ?? 1);
    this.quests.syncFlags(frame);
    return `${data.reward} — progression : ${data.quest}.`;
  }
}
