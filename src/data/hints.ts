export const HINT_TARGETS = [
  { id: "source", x: 1, y: 1, flag: "source_open", label: "la source bloquée" },
  { id: "walker", x: 2, y: 0, flag: "walker_followed", label: "la Clairière des Cimes" },
  { id: "canal", x: 7, y: 5, flag: "mechanism_repaired", label: "le Canal Tari" },
  { id: "wreck", x: 2, y: 6, flag: "wreck_looted", label: "l'Épave Engloutie" },
  { id: "willow", x: 1, y: 4, flag: "map_fragment_1", label: "l'Îlot du Saule" }
] as const;
