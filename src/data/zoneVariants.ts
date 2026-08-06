export interface VariantRule {
  readonly zone: string;
  readonly variant: string;
  readonly requireAll?: readonly string[];
  readonly requireAny?: readonly string[];
  readonly requireNight?: boolean;
}

/**
 * Ce qu'on lit sous le nom de la région.
 *
 * Les variantes portent des identifiants de travail — « v1 », « v_niveau_bas ».
 * Ils partaient tels quels dans le cartouche d'arrivée, et le joueur lisait du
 * code. Une variante sans libellé retombe sur la mention de danger.
 */
export const VARIANT_LABELS: Readonly<Record<string, string>> = {
  v_arbres_partis: "Les arbres sont partis",
  v_nuit_acte2: "Quelque chose veille",
  v_jour: "Clairière tranquille",
  v_en_eau: "Le gué est en eau",
  v_sec: "Le lit est à sec",
  v_repare: "Le pont tient",
  v_casse: "Le pont est rompu",
  v_tourne: "La roue tourne",
  v_arret: "La roue est arrêtée",
  v_niveau_haut: "Les eaux sont hautes",
  v_niveau_bas: "Les eaux sont basses",
};

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
