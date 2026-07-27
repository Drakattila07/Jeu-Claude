import { DIALOGUES, type DialogueId } from "../data/dialogues/core";

export interface DialogueContext {
  readonly flags: ReadonlySet<string>;
  readonly weather: "clear" | "rain";
  readonly hour: number;
}

interface Conditions {
  readonly flag?: string;
  readonly flagMissing?: string;
  readonly weather?: "clear" | "rain";
  readonly night?: boolean;
}

export class DialogueSystem {
  resolve(id: DialogueId, context: DialogueContext): string {
    const entries = DIALOGUES[id];
    const match = entries.find((entry) => this.matches(entry.when, context));
    return match?.text ?? "…";
  }

  private matches(conditions: Conditions, context: DialogueContext): boolean {
    if (conditions.flag && !context.flags.has(conditions.flag)) return false;
    if (conditions.flagMissing && context.flags.has(conditions.flagMissing)) return false;
    if (conditions.weather && conditions.weather !== context.weather) return false;
    if (conditions.night !== undefined) {
      const isNight = context.hour < 6 || context.hour >= 20;
      if (conditions.night !== isNight) return false;
    }
    return true;
  }
}
