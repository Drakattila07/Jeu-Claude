import { CAMPAIGN_TRIGGERS } from "../data/campaignTriggers";
import type { EventBus } from "../core/EventBus";
import type { Flags } from "./Flags";
import type { QuestSystem } from "./Quest";

export class Campaign {
  constructor(private readonly flags: Flags, private readonly quests: QuestSystem, private readonly events: EventBus) {}

  trigger(id: string, frame: number): string | null {
    const data = CAMPAIGN_TRIGGERS.find((candidate) => candidate.id === id);
    if (!data || (data.once && this.flags.has(`trigger:${id}`))) return null;
    this.flags.set(`trigger:${id}`);
    for (const flag of data.setFlags) {
      if (this.flags.set(flag)) this.events.publish({ type: "flag_changed", id: flag, frame });
    }
    if (data.quest) this.quests.notify(data.quest.type, data.quest.target, frame, data.quest.amount ?? 1);
    this.quests.syncFlags(frame);
    return data.message;
  }
}
