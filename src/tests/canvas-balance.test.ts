import { describe, expect, it } from "vitest";
import { Interactable, ZoneObjectState } from "../entities/Interactable";
import { INTERACTABLES, type InteractableKind } from "../data/interactables";
import { Particles } from "../ui/Particles";
import { FloatingText } from "../ui/FloatingText";
import { Pickup } from "../entities/Pickup";
import { Projectile } from "../entities/Projectile";

/**
 * Contexte factice qui compte les `save` et les `restore`.
 *
 * Un dessin qui ouvre un état sans le refermer ne lève aucune erreur : il
 * décale silencieusement tout ce qui vient après. C'est exactement ce qui est
 * arrivé — une racine tranchée sortait de son dessin après `save()`, la pile
 * gagnait un cran par image, et l'interface finissait par se rendre hors de
 * l'écran. Le jeu paraissait figé sans qu'aucune exception ne soit levée, donc
 * sans qu'aucun test ne puisse le voir. Celui-ci le voit.
 */
function countingContext(): CanvasRenderingContext2D & { depth: number; lowest: number } {
  const state = { depth: 0, lowest: 0 };
  const noop = (): void => undefined;
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, property) {
      if (property === "depth") return state.depth;
      if (property === "lowest") return state.lowest;
      if (property === "save") return () => { state.depth += 1; };
      if (property === "restore") {
        return () => {
          state.depth -= 1;
          state.lowest = Math.min(state.lowest, state.depth);
        };
      }
      if (property === "canvas") return { width: 384, height: 216 };
      if (property === "createRadialGradient" || property === "createLinearGradient") {
        return () => ({ addColorStop: noop });
      }
      if (property === "measureText") return () => ({ width: 0 });
      // Toute autre propriété : une fonction inerte ou une valeur assignable.
      return typeof property === "string" ? noop : undefined;
    },
    set() { return true; },
  };
  return new Proxy({}, handler) as unknown as
    CanvasRenderingContext2D & { depth: number; lowest: number };
}

const ALL_KINDS: readonly InteractableKind[] = [
  "well", "sign", "door", "chest", "pot", "bush", "cauldron", "valve",
  "roots", "footprints", "seal", "mechanism", "pickup", "secret",
  "offering", "shrine",
];

describe("équilibre de la pile d'états du canvas", () => {
  it("referme chaque état ouvert par un objet du monde, neuf ou consommé", () => {
    for (const kind of ALL_KINDS) {
      for (const spent of [false, true]) {
        const state = new ZoneObjectState();
        const object = new Interactable(
          { id: "t", zone: "z", kind, x: 64, y: 64, text: "Texte." }, state);
        if (spent) object.interact();
        const ctx = countingContext();
        object.draw(ctx);
        expect(ctx.depth, `${kind}${spent ? " (consommé)" : ""} laisse la pile ouverte`).toBe(0);
        expect(ctx.lowest, `${kind}${spent ? " (consommé)" : ""} dépile trop`).toBe(0);
      }
    }
  });

  it("referme chaque état sur les objets réellement déclarés dans le monde", () => {
    for (const data of INTERACTABLES) {
      for (const spent of [false, true]) {
        const state = new ZoneObjectState();
        const object = new Interactable(data, state);
        if (spent) object.interact();
        const ctx = countingContext();
        object.draw(ctx);
        expect(ctx.depth, `${data.id}${spent ? " (consommé)" : ""}`).toBe(0);
      }
    }
  });

  it("referme chaque état sur les effets et le butin", () => {
    const particles = new Particles();
    particles.emit(10, 10, "leaf", 6);
    particles.emit(10, 10, "blood", 6);
    const floaters = new FloatingText();
    floaters.damage(10, 10, 3, true);
    floaters.reward(10, 10, "+5");
    const pickup = new Pickup({ x: 10, y: 10 }, "heart", 1, 0);
    const projectile = new Projectile({ x: 10, y: 10 }, { x: 1, y: 0 }, "fireball", "player");

    for (const [label, draw] of [
      ["particules", (ctx: CanvasRenderingContext2D) => particles.draw(ctx)],
      ["chiffres", (ctx: CanvasRenderingContext2D) => floaters.draw(ctx)],
      ["butin", (ctx: CanvasRenderingContext2D) => pickup.draw(ctx, 0)],
      ["projectile", (ctx: CanvasRenderingContext2D) => projectile.draw(ctx, 0)],
    ] as const) {
      const ctx = countingContext();
      draw(ctx);
      expect(ctx.depth, `${label} laisse la pile ouverte`).toBe(0);
      expect(ctx.lowest, `${label} dépile trop`).toBe(0);
    }
  });
});
