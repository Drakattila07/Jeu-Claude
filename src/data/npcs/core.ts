export interface NpcScheduleEntry {
  readonly start: number; readonly end: number; readonly zone: string; readonly x: number; readonly y: number;
}
export interface NpcData {
  readonly id: string; readonly name: string; readonly color: "roof" | "purple" | "water" | "leaf" | "sand" | "stone";
  readonly schedule: readonly NpcScheduleEntry[]; readonly chatter: readonly [string, string, string, string];
}

export const NPCS = [
  { id: "doyen_orme", name: "Doyen Orme", color: "roof", schedule: [{ start: 6, end: 22, zone: "place_puits", x: 224, y: 144 }], chatter: [
    "La vallée change plus vite que ma vieille carte.", "Le puits était là avant nos maisons.", "Marque les sentiers, mais aussi les silences.", "Reviens quand la source aura parlé."
  ]},
  { id: "mira", name: "Mira", color: "leaf", schedule: [{ start: 11, end: 19, zone: "place_puits", x: 384, y: 176 }, { start: 6, end: 11, zone: "lisiere_carrefour", x: 160, y: 160 }], chatter: [
    "Les simples n'ont rien de simple.", "J'achète ce qui pousse sans permission.", "La rosée garde mieux les secrets.", "Ne mâche jamais une racine qui crie."
  ]},
  { id: "bram", name: "Bram", color: "stone", schedule: [{ start: 8, end: 20, zone: "hameau_nord", x: 192, y: 160 }], chatter: [
    "Une lame s'écoute avant de se frapper.", "Mon enclume connaît toutes les colères.", "Le bon métal chante sous le marteau.", "Ramène-moi du minerai de lune."
  ]},
  { id: "nessa", name: "Nessa", color: "water", schedule: [{ start: 6, end: 20, zone: "quai_lac", x: 256, y: 256 }], chatter: [
    "Le lac ment quand il est trop calme.", "Un poisson voit la pluie avant nous.", "Ma canne a encore disparu.", "Marche doucement près des roseaux."
  ]},
  { id: "ryn", name: "Ryn", color: "sand", schedule: [{ start: 6, end: 22, zone: "hameau_sud", x: 192, y: 192 }], chatter: [
    "Tam se trompe. C'était pierre, eau…", "Je suis né trois minutes avant lui.", "La dalle rouge vient en premier.", "Ne répète pas ma moitié de comptine."
  ]},
  { id: "tam", name: "Tam", color: "sand", schedule: [{ start: 6, end: 22, zone: "hameau_sud", x: 240, y: 192 }], chatter: [
    "Ryn se trompe. C'était eau, pierre…", "Il est né deux minutes avant moi.", "La dalle rouge vient en dernier.", "Ma moitié est évidemment la bonne."
  ]},
  { id: "colporteur", name: "Le Colporteur", color: "roof", schedule: [{ start: 8, end: 20, zone: "lisiere_carrefour", x: 288, y: 288 }], chatter: [
    "Rare, authentique, presque légal !", "Je rembourse demain. Sans doute.", "Mon sac est plus grand dedans.", "Deux cents rubis et nous sommes quittes."
  ]},
  { id: "sylve", name: "Sylve", color: "leaf", schedule: [{ start: 6, end: 22, zone: "place_puits", x: 160, y: 288 }], chatter: [
    "…", "Sylve pointe vers le nord.", "Sylve dessine un cercle dans la poussière.", "Sylve vous tend une petite feuille."
  ]},
  { id: "gorm", name: "Gorm", color: "stone", schedule: [{ start: 0, end: 24, zone: "marches_ruines", x: 384, y: 160 }], chatter: [
    "VA-T'EN.", "Je n'ai rien à dire aux cartes.", "Pose la pomme et recule.", "Le canal n'a pas été bâti pour dormir."
  ]},
  { id: "iris", name: "Îris", color: "purple", schedule: [{ start: 0, end: 24, zone: "lisiere_carrefour", x: 96, y: 288 }], chatter: [
    "Toute information a un prix.", "Ton sac sent l'objet rare.", "La pluie est une vieille dette.", "Le chaudron sait. Moi aussi."
  ]},
  { id: "maelis", name: "Maëlis", color: "purple", schedule: [{ start: 0, end: 24, zone: "cabane_iris", x: 224, y: 192 }], chatter: [
    "La lune laisse des griffes dans le ciel.", "Mon familier choisit lui-même ses voyageurs.", "Ce chaudron prépare des souvenirs, pas des soupes.", "Écoute la tour : elle rêve en pierre."
  ]},
  { id: "crane", name: "Le Crâne", color: "stone", schedule: [{ start: 0, end: 24, zone: "lisiere_carrefour", x: 64, y: 272 }], chatter: [
    "Perdu ? Quel délicieux parfum.", "Les morts font d'excellents cartographes.", "J'aurais un indice, si j'avais une langue.", "Dix minutes sans progrès. Impressionnant."
  ]},
  { id: "garde_ronan", name: "Garde Ronan", color: "stone", schedule: [{ start: 0, end: 24, zone: "place_puits", x: 416, y: 288 }], chatter: [
    "Je veille sur la place et ses habitants.", "L'épée reste au fourreau dans le village.", "Les loups descendent parfois de la Lisière.", "Un bon garde écoute avant de frapper."
  ]},
  { id: "fermier_a", name: "Alban", color: "sand", schedule: [{ start: 7, end: 18, zone: "marches_ruines", x: 128, y: 288 }], chatter: [
    "La terre boit tout ce qu'on lui donne.", "Le blé penche avant le vent.", "On manque d'eau, pas de travail.", "Le moulin repartira."
  ]},
  { id: "fermier_b", name: "Béa", color: "sand", schedule: [{ start: 7, end: 18, zone: "marches_ruines", x: 176, y: 288 }], chatter: [
    "J'ai caché la clé dans le foin.", "Les corbeaux connaissent les récoltes.", "Mira paie bien les graines.", "Le moulin repartira."
  ]}
] as const satisfies readonly NpcData[];
