import type { EventBus } from "../core/EventBus";
import type { QuestDefinition, QuestStepType } from "../data/quests/core";
import { QUESTS } from "../data/quests/core";
import type { Flags } from "./Flags";

export type QuestStatus = "locked" | "active" | "complete";
export interface QuestRecord { status: QuestStatus; step: number; progress: number }
export interface ActiveObjective {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly step: number;
  readonly stepCount: number;
  readonly progress: number;
  readonly targetCount: number;
}

export class QuestSystem {
  private readonly records = new Map<string, QuestRecord>();

  constructor(
    private readonly flags: Flags,
    private readonly events: EventBus,
    private readonly definitions: readonly QuestDefinition[] = QUESTS,
  ) {
    for (const quest of definitions) this.records.set(quest.id, { status: "locked", step: 0, progress: 0 });
  }

  refresh(): void {
    for (const quest of this.definitions) {
      const record = this.records.get(quest.id)!;
      if (record.status === "locked" && quest.prerequisites.every((flag) => this.flags.has(flag))) {
        record.status = "active";
        this.events.publish({ type: "quest_started", id: quest.id, frame: 0 });
      }
    }
  }

  notify(type: QuestStepType, target: string, frame: number, amount = 1): void {
    for (const quest of this.definitions) {
      const record = this.records.get(quest.id)!;
      if (record.status !== "active") continue;
      const step = quest.steps[record.step];
      if (!step || step.type !== type || step.target !== target) continue;
      record.progress += amount;
      if (record.progress >= (step.count ?? 1)) {
        record.step += 1;
        record.progress = 0;
        this.events.publish({ type: "quest_step", id: `${quest.id}:${step.id}`, frame });
        if (record.step >= quest.steps.length) this.complete(quest, record, frame);
      }
    }
    this.refresh();
  }

  syncFlags(frame: number): void {
    for (const quest of this.definitions) {
      const record = this.records.get(quest.id)!;
      if (record.status !== "active") continue;
      const step = quest.steps[record.step];
      if (step?.type === "flag" && this.flags.has(step.target)) this.notify("flag", step.target, frame);
    }
  }

  activeObjectives(limit = 4): readonly ActiveObjective[] {
    const objectives: ActiveObjective[] = [];
    for (const quest of this.definitions) {
      const record = this.records.get(quest.id)!;
      if (record.status === "active") {
        const step = quest.steps[record.step];
        if (step) {
          objectives.push({
            id: quest.id,
            title: quest.title,
            hint: step.hint,
            step: record.step + 1,
            stepCount: quest.steps.length,
            progress: record.progress,
            targetCount: step.count ?? 1,
          });
        }
      }
      if (objectives.length >= limit) break;
    }
    return objectives;
  }

  activeObjective(): ActiveObjective | null {
    return this.activeObjectives(1)[0] ?? null;
  }

  snapshot(): Readonly<Record<string, QuestRecord>> {
    return Object.fromEntries([...this.records].map(([id, value]) => [id, { ...value }]));
  }

  restore(snapshot: Readonly<Record<string, QuestRecord>>): void {
    for (const [id, value] of Object.entries(snapshot)) {
      if (this.records.has(id)) this.records.set(id, { ...value });
    }
  }

  private complete(quest: QuestDefinition, record: QuestRecord, frame: number): void {
    record.status = "complete";
    for (const reward of quest.rewards) if (reward.type === "flag") this.flags.set(reward.id);
    for (const flag of quest.worldEffects) this.flags.set(flag);
    this.events.publish({ type: "quest_complete", id: quest.id, frame });
  }
}
