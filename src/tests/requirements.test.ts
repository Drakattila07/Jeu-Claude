import { describe, expect, it } from "vitest";
import { Flags } from "../systems/Flags";
import { Inventory } from "../systems/Inventory";
import { Requirements, type WorldState } from "../systems/Requirements";

const DAY_CLEAR: WorldState = { isNight: false, weather: "clear", rupees: 0, explored: 0 };
const NIGHT_RAIN: WorldState = { isNight: true, weather: "rain", rupees: 0, explored: 0 };

describe("conditions des objets du monde", () => {
  it("laisse passer un objet sans condition", () => {
    const requirements = new Requirements(new Flags(), new Inventory());
    expect(requirements.check(undefined, DAY_CLEAR)).toEqual({ ok: true });
  });

  it("exige les objets et donne la raison du refus", () => {
    const inventory = new Inventory();
    const requirements = new Requirements(new Flags(), inventory);
    const rule = {
      items: [{ item: "candle", count: 7 }] as const,
      refusal: "Il faut sept chandelles.",
    };
    expect(requirements.check(rule, NIGHT_RAIN)).toEqual({ ok: false, reason: "Il faut sept chandelles." });
    inventory.add("candle", 7);
    expect(requirements.check(rule, NIGHT_RAIN).ok).toBe(true);
  });

  it("ne consomme le sac qu'une fois la condition remplie", () => {
    const inventory = new Inventory();
    inventory.add("apple", 3);
    const requirements = new Requirements(new Flags(), inventory);
    const rule = { items: [{ item: "apple", count: 3 }] as const, refusal: "Trois pommes." };

    const tooPoor = new Requirements(new Flags(), new Inventory());
    expect(tooPoor.consume(rule, DAY_CLEAR).ok).toBe(false);

    expect(requirements.consume(rule, DAY_CLEAR).ok).toBe(true);
    expect(inventory.count("apple")).toBe(0);
  });

  it("impose la nuit et la pluie quand la quête le demande", () => {
    const requirements = new Requirements(new Flags(), new Inventory());
    const nocturne = { night: true, refusal: "Revenez la nuit." };
    expect(requirements.check(nocturne, DAY_CLEAR).ok).toBe(false);
    expect(requirements.check(nocturne, NIGHT_RAIN).ok).toBe(true);

    const pluvieux = { weather: "rain" as const, refusal: "Il faut la pluie." };
    expect(requirements.check(pluvieux, DAY_CLEAR).ok).toBe(false);
    expect(requirements.check(pluvieux, NIGHT_RAIN).ok).toBe(true);
  });

  it("vérifie les drapeaux, les rubis et l'exploration", () => {
    const flags = new Flags();
    const requirements = new Requirements(flags, new Inventory());
    const rule = { flags: ["heard_ryn", "heard_tam"], refusal: "Une moitié manque." };
    flags.set("heard_ryn");
    expect(requirements.check(rule, DAY_CLEAR).ok).toBe(false);
    flags.set("heard_tam");
    expect(requirements.check(rule, DAY_CLEAR).ok).toBe(true);

    const riche = { rupees: 200, refusal: "Pas assez." };
    expect(requirements.check(riche, DAY_CLEAR).ok).toBe(false);
    expect(requirements.check(riche, { ...DAY_CLEAR, rupees: 200 }).ok).toBe(true);

    const cartographe = { explored: 56, refusal: "Explorez encore." };
    expect(requirements.check(cartographe, { ...DAY_CLEAR, explored: 55 }).ok).toBe(false);
    expect(requirements.check(cartographe, { ...DAY_CLEAR, explored: 56 }).ok).toBe(true);
  });
});
