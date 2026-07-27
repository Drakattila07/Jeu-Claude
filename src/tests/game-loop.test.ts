import { describe, expect, it } from "vitest";
import { consumeAccumulator, FIXED_STEP_MS } from "../core/Game";

describe("boucle à pas fixe", () => {
  it("produit le même nombre de frames quelle que soit la découpe du temps", () => {
    const run = (chunks: readonly number[]): number => {
      let accumulatorMs = 0;
      let frames = 0;
      for (const chunk of chunks) {
        const result = consumeAccumulator(accumulatorMs, chunk);
        accumulatorMs = result.accumulatorMs;
        frames += result.steps;
      }
      return frames;
    };
    expect(run(Array.from({ length: 60 }, () => FIXED_STEP_MS))).toBe(60);
    expect(run(Array.from({ length: 120 }, () => FIXED_STEP_MS / 2))).toBe(60);
  });

  it("conserve le reliquat sub-frame", () => {
    const first = consumeAccumulator(0, FIXED_STEP_MS * 2.5);
    const second = consumeAccumulator(first.accumulatorMs, FIXED_STEP_MS / 2);
    expect(first.steps).toBe(2);
    expect(second.steps).toBe(1);
    expect(second.accumulatorMs).toBeCloseTo(0);
  });
});
