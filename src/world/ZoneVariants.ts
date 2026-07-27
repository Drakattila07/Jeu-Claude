import type { VariantRule } from "../data/zoneVariants";
import { ZONE_VARIANT_RULES } from "../data/zoneVariants";

export interface VariantContext {
  readonly flags: ReadonlySet<string>;
  readonly isNight: boolean;
}

export class ZoneVariants {
  constructor(private readonly rules: readonly VariantRule[] = ZONE_VARIANT_RULES) {}

  resolve(zoneId: string, context: VariantContext): string {
    const rule = this.rules.find((candidate) => candidate.zone === zoneId && this.matches(candidate, context));
    return rule?.variant ?? "default";
  }

  private matches(rule: VariantRule, context: VariantContext): boolean {
    if (rule.requireNight !== undefined && rule.requireNight !== context.isNight) return false;
    if (rule.requireAll && !rule.requireAll.every((flag) => context.flags.has(flag))) return false;
    if (rule.requireAny && !rule.requireAny.some((flag) => context.flags.has(flag))) return false;
    return true;
  }
}
