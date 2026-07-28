import { describe, expect, it } from "vitest";
import { EventBus } from "../core/EventBus";
import { Campaign } from "../systems/Campaign";
import { Flags } from "../systems/Flags";
import { QuestSystem } from "../systems/Quest";

describe("campagne", () => {
  it("applique les effets en cascade de la source une seule fois", () => {
    const flags = new Flags();
    const events = new EventBus();
    const quests = new QuestSystem(flags, events);
    const campaign = new Campaign(flags, quests, events);
    quests.refresh();
    campaign.trigger("bram_sword", 1);
    expect(campaign.trigger("source_roots", 2)).toContain("eau");
    expect(flags.has("source_open")).toBe(true);
    expect(campaign.trigger("source_roots", 3)).toBeNull();
  });
});
