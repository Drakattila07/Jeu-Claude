export type NpcActivity =
  | "walk" | "sweep" | "fish" | "forge" | "gather" | "sell"
  | "rest" | "ball" | "farm" | "guard" | "brew" | "inspect" | "meditate";

export interface NpcRoutineStep {
  readonly activity: NpcActivity;
  readonly duration: number;
  readonly offset: readonly [number, number];
  readonly facing?: "left" | "right" | "up" | "down";
}

const DEFAULT_ROUTINE: readonly NpcRoutineStep[] = [
  { activity: "walk", duration: 260, offset: [2, 1] },
  { activity: "rest", duration: 200, offset: [2, 1] },
  { activity: "walk", duration: 260, offset: [-2, -1] },
];

export const NPC_ROUTINES: Readonly<Record<string, readonly NpcRoutineStep[]>> = {
  doyen_orme: [
    { activity: "walk", duration: 260, offset: [2, 1] },
    { activity: "inspect", duration: 240, offset: [3, 1], facing: "down" },
    { activity: "walk", duration: 260, offset: [-2, 2] },
    { activity: "sweep", duration: 210, offset: [1, 3], facing: "right" },
    { activity: "rest", duration: 220, offset: [-1, 0], facing: "down" },
  ],
  mira: [
    { activity: "walk", duration: 250, offset: [-2, 2] },
    { activity: "gather", duration: 230, offset: [-3, 2], facing: "down" },
    { activity: "walk", duration: 260, offset: [-1, 4] },
    { activity: "gather", duration: 230, offset: [2, 3], facing: "left" },
    { activity: "sell", duration: 250, offset: [0, 1], facing: "left" },
  ],
  bram: [
    { activity: "walk", duration: 220, offset: [-2, 2] },
    { activity: "forge", duration: 320, offset: [0, 0], facing: "right" },
    { activity: "inspect", duration: 220, offset: [3, 1], facing: "down" },
    { activity: "rest", duration: 180, offset: [1, 3], facing: "left" },
  ],
  nessa: [
    { activity: "walk", duration: 260, offset: [-3, 1] },
    { activity: "gather", duration: 180, offset: [-1, 2], facing: "down" },
    { activity: "walk", duration: 260, offset: [1, 0] },
    { activity: "fish", duration: 480, offset: [1, 0], facing: "right" },
    { activity: "rest", duration: 180, offset: [-2, -1], facing: "down" },
  ],
  ryn: [
    { activity: "walk", duration: 220, offset: [-2, 0] },
    { activity: "ball", duration: 420, offset: [1, 1], facing: "right" },
    { activity: "rest", duration: 160, offset: [-1, 2], facing: "up" },
    { activity: "ball", duration: 420, offset: [1, -1], facing: "right" },
  ],
  tam: [
    { activity: "walk", duration: 220, offset: [2, 0] },
    { activity: "ball", duration: 420, offset: [-1, 1], facing: "left" },
    { activity: "rest", duration: 160, offset: [1, 2], facing: "up" },
    { activity: "ball", duration: 420, offset: [-1, -1], facing: "left" },
  ],
  colporteur: [
    { activity: "walk", duration: 300, offset: [-3, -2] },
    { activity: "sell", duration: 360, offset: [0, 0], facing: "down" },
    { activity: "walk", duration: 300, offset: [3, -1] },
    { activity: "rest", duration: 180, offset: [1, 2], facing: "left" },
  ],
  sylve: [
    { activity: "walk", duration: 300, offset: [3, -2] },
    { activity: "gather", duration: 220, offset: [3, -2], facing: "up" },
    { activity: "walk", duration: 300, offset: [4, 1] },
    { activity: "meditate", duration: 300, offset: [1, 2], facing: "down" },
    { activity: "gather", duration: 220, offset: [-2, 1], facing: "left" },
  ],
  gorm: [
    { activity: "guard", duration: 320, offset: [0, 0], facing: "left" },
    { activity: "walk", duration: 300, offset: [-4, 2] },
    { activity: "inspect", duration: 240, offset: [-2, -2], facing: "up" },
    { activity: "guard", duration: 320, offset: [1, 2], facing: "right" },
  ],
  iris: [
    { activity: "brew", duration: 340, offset: [0, 0], facing: "right" },
    { activity: "gather", duration: 240, offset: [3, -2], facing: "down" },
    { activity: "walk", duration: 300, offset: [4, 1] },
    { activity: "meditate", duration: 260, offset: [1, 2], facing: "up" },
  ],
  maelis: [
    { activity: "brew", duration: 360, offset: [0, 0], facing: "up" },
    { activity: "walk", duration: 260, offset: [-2, 1] },
    { activity: "inspect", duration: 260, offset: [-2, 1], facing: "left" },
    { activity: "walk", duration: 260, offset: [2, 1] },
    { activity: "meditate", duration: 320, offset: [0, 3], facing: "down" },
  ],
  crane: [
    { activity: "meditate", duration: 300, offset: [0, 0], facing: "down" },
    { activity: "walk", duration: 260, offset: [3, -1] },
    { activity: "inspect", duration: 260, offset: [1, 2], facing: "left" },
  ],
  garde_ronan: [
    { activity: "guard", duration: 300, offset: [0, 0], facing: "left" },
    { activity: "walk", duration: 360, offset: [-4, -3] },
    { activity: "guard", duration: 300, offset: [-2, 1], facing: "up" },
    { activity: "walk", duration: 360, offset: [0, -5] },
  ],
  fermier_a: [
    { activity: "walk", duration: 280, offset: [-2, -2] },
    { activity: "farm", duration: 360, offset: [2, 0], facing: "down" },
    { activity: "walk", duration: 280, offset: [4, -2] },
    { activity: "sweep", duration: 180, offset: [1, 2], facing: "right" },
    { activity: "rest", duration: 180, offset: [-1, 1], facing: "down" },
  ],
  fermier_b: [
    { activity: "farm", duration: 360, offset: [-1, 0], facing: "down" },
    { activity: "walk", duration: 300, offset: [4, 1] },
    { activity: "farm", duration: 360, offset: [2, -2], facing: "left" },
    { activity: "rest", duration: 200, offset: [-2, 2], facing: "right" },
  ],
};

export function routineFor(id: string): readonly NpcRoutineStep[] {
  return NPC_ROUTINES[id] ?? DEFAULT_ROUTINE;
}

export function routineStateFor(id: string, frame: number): {
  readonly index: number;
  readonly step: NpcRoutineStep;
  readonly elapsed: number;
} {
  const routine = routineFor(id);
  const cycleDuration = routine.reduce((total, step) => total + step.duration, 0);
  let cursor = ((frame % cycleDuration) + cycleDuration) % cycleDuration;
  for (let index = 0; index < routine.length; index += 1) {
    const step = routine[index]!;
    if (cursor < step.duration) return { index, step, elapsed: cursor };
    cursor -= step.duration;
  }
  return { index: 0, step: routine[0]!, elapsed: 0 };
}
