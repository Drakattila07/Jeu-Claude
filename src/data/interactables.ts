export const INTERACTABLES = [
  { id: "well", zone: "place_puits", kind: "well", x: 128, y: 112, text: "Le seau remonte vide. Il ne reste que de la poussière." },
  { id: "valley_sign", zone: "place_puits", kind: "sign", x: 32, y: 48, text: "VALLÉE DE BRUYÈRE — Flèches : marcher. X : agir. Entrée : sac." },
  { id: "elder_house_door", zone: "place_puits", kind: "door", x: 128, y: 48, text: "Entrer dans la maison du Doyen." },
  { id: "hermitage_door", zone: "ermitage_gorm", kind: "door", x: 176, y: 64, text: "Entrer dans l'ermitage de Gorm." },
  { id: "castle_gate", zone: "portail_scelle", kind: "door", x: 120, y: 80, text: "Franchir les portes du Château de Cendre." },
  { id: "starter_chest", zone: "hameau_nord", kind: "chest", x: 96, y: 128, text: "Vous trouvez 20 rubis !" },
  { id: "south_pot", zone: "hameau_sud", kind: "pot", x: 176, y: 112, text: "Une vieille jarre fêlée." },
  { id: "quay_bush", zone: "quai_lac", kind: "bush", x: 64, y: 96, text: "Un buisson agité par le vent du lac." }
  ,{ id: "iris_cauldron", zone: "lisiere_carrefour", kind: "cauldron", x: 48, y: 112, text: "Le chaudron bouillonne d'impatience." }
  ,{ id: "canal_valve", zone: "canal_entry", kind: "valve", x: 128, y: 112, text: "Une lourde vanne de bronze." }
  ,{ id: "source_roots", zone: "bosquet_souches", kind: "roots", x: 128, y: 64, text: "Des racines épaisses bloquent la vanne." }
  ,{ id: "walker_trace", zone: "clairiere_cimes", kind: "footprints", x: 112, y: 112, text: "D'immenses empreintes quittent la clairière." }
  ,{ id: "seal_a", zone: "marches_ruines", kind: "seal", x: 80, y: 96, text: "Le Sceau du Bloc." }
  ,{ id: "seal_b", zone: "marches_ruines", kind: "seal", x: 128, y: 64, text: "Le Sceau du Regard." }
  ,{ id: "seal_c", zone: "marches_ruines", kind: "seal", x: 176, y: 96, text: "Le Sceau du Rythme." }
  ,{ id: "mechanism_heart", zone: "canal_entry", kind: "mechanism", x: 176, y: 80, text: "La roue centrale attend une impulsion." }
  ,{ id: "lost_rod", zone: "lisiere_carrefour", kind: "pickup", x: 208, y: 144, text: "La canne perdue de Nessa !" }
  ,{ id: "ghost_stump", zone: "bosquet_souches", kind: "secret", x: 64, y: 128, text: "La Souche Fantôme est coincée." }
  ,{ id: "statue_intersection", zone: "marches_ruines", kind: "secret", x: 128, y: 128, text: "Les six regards convergent ici." }
] as const;

export type InteractableData = (typeof INTERACTABLES)[number];
