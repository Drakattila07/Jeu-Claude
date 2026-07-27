export const INTERACTABLES = [
  { id: "well", zone: "place_puits", kind: "well", x: 128, y: 112, text: "Le seau remonte vide. Il ne reste que de la poussière." },
  { id: "valley_sign", zone: "place_puits", kind: "sign", x: 32, y: 48, text: "VALLÉE DE BRUYÈRE — Flèches : marcher. X : agir. Entrée : sac." },
  { id: "starter_chest", zone: "hameau_nord", kind: "chest", x: 96, y: 128, text: "Vous trouvez 20 rubis !" },
  { id: "south_pot", zone: "hameau_sud", kind: "pot", x: 176, y: 112, text: "Une vieille jarre fêlée." },
  { id: "quay_bush", zone: "quai_lac", kind: "bush", x: 64, y: 96, text: "Un buisson agité par le vent du lac." }
] as const;

export type InteractableData = (typeof INTERACTABLES)[number];
