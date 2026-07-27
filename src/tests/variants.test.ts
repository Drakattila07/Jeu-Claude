import { describe, expect, it } from "vitest";
import { ZoneVariants } from "../world/ZoneVariants";

describe("variantes de monde", () => {
  it("sélectionne la première règle satisfaite", () => {
    const resolver = new ZoneVariants();
    expect(resolver.resolve("lisiere_carrefour", { flags: new Set(), isNight: false })).toBe("v1");
    expect(resolver.resolve("lisiere_carrefour", { flags: new Set(["act1_complete"]), isNight: false })).toBe("v2");
    expect(resolver.resolve("lisiere_carrefour", { flags: new Set(["act1_complete", "lake_high"]), isNight: false })).toBe("v3");
  });

  it("reconfigure les dix zones du lac avec un seul flag", () => {
    const resolver = new ZoneVariants();
    expect(resolver.resolve("epave", { flags: new Set(["lake_high"]), isNight: false })).toBe("v_niveau_haut");
  });
});
