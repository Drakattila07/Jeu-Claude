import { describe, expect, it } from "vitest";
import { SOUND_DEFINITIONS } from "../systems/Audio";

describe("audio synthétisé", () => {
  it("déclare des sons courts et secs", () => {
    expect(SOUND_DEFINITIONS.hit.duration).toBeLessThan(0.1);
    expect(SOUND_DEFINITIONS.sword.type).toBe("square");
    expect(Object.keys(SOUND_DEFINITIONS)).toContain("text");
  });
});
