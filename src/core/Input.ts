export const ACTIONS = ["Up", "Down", "Left", "Right", "A", "Attack", "B", "Start", "Select"] as const;
export type Action = (typeof ACTIONS)[number];

const KEY_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowUp: "Up", KeyW: "Up", ArrowDown: "Down", KeyS: "Down",
  ArrowLeft: "Left", KeyA: "Left", ArrowRight: "Right", KeyD: "Right",
  KeyX: "A", Space: "Attack", KeyC: "B", Enter: "Start", ShiftLeft: "Select"
};

export class Input {
  private readonly held = new Set<Action>();
  private readonly pressed = new Set<Action>();

  constructor(target: Window = window) {
    target.addEventListener("keydown", (event) => {
      const action = KEY_BINDINGS[event.code];
      if (!action) return;
      event.preventDefault();
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    });
    target.addEventListener("keyup", (event) => {
      const action = KEY_BINDINGS[event.code];
      if (!action) return;
      event.preventDefault();
      this.held.delete(action);
    });
    target.addEventListener("blur", () => this.held.clear());
  }

  isDown(action: Action): boolean { return this.held.has(action); }
  wasPressed(action: Action): boolean { return this.pressed.has(action); }
  endFrame(): void { this.pressed.clear(); }
}
