export const ACTIONS = [
  "Up", "Down", "Left", "Right",
  "A", "Attack", "B", "Start", "Select", "Dash", "Map", "Cancel",
  // Le bouclier : une garde ne peut pas partager sa touche avec l'esquive,
  // sinon lever le bouclier revient à rouler.
  "Guard",
] as const;
export type Action = (typeof ACTIONS)[number];

const KEY_BINDINGS: Readonly<Record<string, Action>> = {
  ArrowUp: "Up", KeyW: "Up", ArrowDown: "Down", KeyS: "Down",
  ArrowLeft: "Left", KeyA: "Left", ArrowRight: "Right", KeyD: "Right",
  KeyX: "A", KeyJ: "A",
  Space: "Attack", KeyK: "Attack",
  KeyC: "B", KeyL: "B",
  ShiftLeft: "Dash", ShiftRight: "Dash",
  KeyF: "Select", KeyR: "Select",
  KeyE: "Guard", KeyQ: "Guard",
  Enter: "Start", KeyI: "Start",
  Tab: "Map", KeyM: "Map",
  Escape: "Cancel", Backspace: "Cancel",
};

/** Boutons de manette, disposition XInput standard. */
const PAD_BUTTONS: Readonly<Record<number, Action>> = {
  0: "A", 1: "Cancel", 2: "B", 3: "Attack",
  // La gâchette gauche tient le bouclier ; la carte passe au clic de stick.
  4: "Select", 5: "Dash", 6: "Guard", 7: "Dash", 8: "Map",
  9: "Start", 12: "Up", 13: "Down", 14: "Left", 15: "Right",
};

const AXIS_DEADZONE = 0.4;

export class Input {
  private readonly held = new Set<Action>();
  private readonly pressed = new Set<Action>();
  private readonly padHeld = new Set<Action>();
  /** Axes analogiques, pour une marche progressive à la manette. */
  private axis = { x: 0, y: 0 };
  private padConnected = false;

  constructor(target: Window = window) {
    target.addEventListener("keydown", (event) => {
      const action = KEY_BINDINGS[event.code];
      if (!action) return;
      event.preventDefault();
      if (event.repeat) return;
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    });
    target.addEventListener("keyup", (event) => {
      const action = KEY_BINDINGS[event.code];
      if (!action) return;
      event.preventDefault();
      this.held.delete(action);
    });
    target.addEventListener("blur", () => {
      this.held.clear();
      this.padHeld.clear();
    });
  }

  /** Relève l'état de la manette. Appelé une fois par pas de simulation. */
  poll(): void {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pad = [...navigator.getGamepads()].find((candidate) => candidate?.connected);
    if (!pad) {
      if (this.padConnected) {
        for (const action of this.padHeld) this.held.delete(action);
        this.padHeld.clear();
        this.padConnected = false;
        this.axis = { x: 0, y: 0 };
      }
      return;
    }
    this.padConnected = true;

    const next = new Set<Action>();
    for (const [indexText, action] of Object.entries(PAD_BUTTONS)) {
      if (pad.buttons[Number(indexText)]?.pressed) next.add(action);
    }
    const stickX = pad.axes[0] ?? 0;
    const stickY = pad.axes[1] ?? 0;
    if (stickX < -AXIS_DEADZONE) next.add("Left");
    if (stickX > AXIS_DEADZONE) next.add("Right");
    if (stickY < -AXIS_DEADZONE) next.add("Up");
    if (stickY > AXIS_DEADZONE) next.add("Down");
    this.axis = {
      x: Math.abs(stickX) > AXIS_DEADZONE ? stickX : 0,
      y: Math.abs(stickY) > AXIS_DEADZONE ? stickY : 0,
    };

    for (const action of next) {
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    }
    for (const action of this.padHeld) {
      if (!next.has(action)) this.held.delete(action);
    }
    this.padHeld.clear();
    for (const action of next) this.padHeld.add(action);
  }

  isDown(action: Action): boolean { return this.held.has(action); }
  wasPressed(action: Action): boolean { return this.pressed.has(action); }

  /**
   * Direction voulue, normalisée. Le stick analogique gagne s'il est engagé,
   * sinon on retombe sur les touches — huit directions franches.
   */
  direction(): { readonly x: number; readonly y: number } {
    if (this.axis.x !== 0 || this.axis.y !== 0) {
      const length = Math.hypot(this.axis.x, this.axis.y);
      return { x: this.axis.x / length, y: this.axis.y / length };
    }
    const x = (this.isDown("Right") ? 1 : 0) - (this.isDown("Left") ? 1 : 0);
    const y = (this.isDown("Down") ? 1 : 0) - (this.isDown("Up") ? 1 : 0);
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  endFrame(): void { this.pressed.clear(); }
}
