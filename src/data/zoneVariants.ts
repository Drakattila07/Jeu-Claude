export interface VariantRule {
  readonly zone: string;
  readonly variant: string;
  readonly requireAll?: readonly string[];
  readonly requireAny?: readonly string[];
  readonly requireNight?: boolean;
}

export const ZONE_VARIANT_RULES: readonly VariantRule[] = [
  { zone: "lisiere_sentier", variant: "v2", requireAll: ["source_open"] },
  { zone: "lisiere_sentier", variant: "v1" },
  { zone: "lisiere_carrefour", variant: "v3", requireAll: ["lake_high"] },
  { zone: "lisiere_carrefour", variant: "v2", requireAll: ["act1_complete"] },
  { zone: "lisiere_carrefour", variant: "v1" },
  { zone: "clairiere_cimes", variant: "v_arbres_partis", requireAll: ["walker_followed"] },
  { zone: "clairiere_cimes", variant: "v_nuit_acte2", requireAll: ["act1_complete"], requireNight: true },
  { zone: "clairiere_cimes", variant: "v_jour" },
  { zone: "riviere_gue", variant: "v_en_eau", requireAll: ["source_open"] },
  { zone: "riviere_gue", variant: "v_sec" },
  { zone: "riviere_pont", variant: "v_repare", requireAll: ["bridge_repaired"] },
  { zone: "riviere_pont", variant: "v_casse" },
  { zone: "moulin_brise", variant: "v_tourne", requireAll: ["lake_high"] },
  { zone: "moulin_brise", variant: "v_arret" },
  ...["lac_rive", "lac_profond_1", "lac_profond_2", "lac_centre", "lac_est",
    "epave", "grotte_noyee", "lac_fond", "roseaux", "grotte_sud"].flatMap((zone) => [
    { zone, variant: "v_niveau_haut", requireAll: ["lake_high"] },
    { zone, variant: "v_niveau_bas" }
  ])
];
