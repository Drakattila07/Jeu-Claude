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
  ]},

  // — Port-Marée et le large —
  { id: "sarn", name: "Sarn le Charpentier", color: "water", schedule: [
    { start: 6, end: 20, zone: "port_maree", x: 240, y: 272 },
    { start: 20, end: 24, zone: "port_maree", x: 176, y: 208 }
  ], chatter: [
    "Une coque, ça se répare pas à la parole.", "Deux bordés et un filin, pas moins.",
    "La mer ne pardonne pas le travail bâclé.", "Ramenez-moi de quoi river, on verra."
  ]},
  { id: "veuve_hale", name: "La Veuve Hale", color: "purple", schedule: [
    { start: 0, end: 24, zone: "ile_du_phare", x: 240, y: 224 }
  ], chatter: [
    "Je tiens la lampe depuis quarante ans.", "Trois bateaux sont partis vers le Volcan. Aucun n'est revenu.",
    "Les courants ne se devinent pas, ils se lisent.", "Mon mari a dessiné la Carte avant de sombrer."
  ]},
  { id: "mousse_pib", name: "Pib", color: "sand", schedule: [
    { start: 7, end: 21, zone: "port_maree", x: 336, y: 208 }
  ], chatter: [
    "J'irai en mer, moi aussi. Bientôt.", "Sarn dit que je noue mal. Sarn dit toujours ça.",
    "On a vu de la fumée au sud. De la vraie.", "Vous avez un bateau ? Emmenez-moi !"
  ]},
  { id: "gardien_vertepierre", name: "Vieil Ordan", color: "stone", schedule: [
    { start: 0, end: 24, zone: "avant_cour", x: 240, y: 336 }
  ], chatter: [
    "Vertepierre garde ce que la mer réclame.", "Trois portes, trois clés. C'était l'usage.",
    "Le Chevalier n'a jamais quitté la dernière salle.", "N'y allez pas sans épée. Ni sans raison."
  ]},

  // — Les nouveaux venus —

  /**
   * Wren ne tient pas en place : elle fait la tournée des trois villages dans
   * la journée. C'est elle qui enseigne les airs de la flûte de saule.
   */
  { id: "wren", name: "Wren la Baladine", color: "purple", schedule: [
    { start: 6, end: 11, zone: "hameau_nord", x: 288, y: 224 },
    { start: 11, end: 16, zone: "place_puits", x: 320, y: 256 },
    { start: 16, end: 21, zone: "hameau_sud", x: 288, y: 256 },
    { start: 21, end: 24, zone: "quai_lac", x: 192, y: 288 }
  ], chatter: [
    "Trois airs, pas un de plus. Le reste, c'est du bruit.",
    "Un air se paie en écoute, pas en rubis.",
    "La pluie a une note. La nuit en a une autre.",
    "Le saule donne le meilleur bois : il a l'habitude de pleurer."
  ]},

  /**
   * Fennec passe le lac à la rame pour qui n'a pas encore de coque. Il
   * disparaît le jour où l'on possède la barque de Sarn — et il le prend mal.
   */
  { id: "fennec", name: "Fennec le Passeur", color: "water", schedule: [
    { start: 5, end: 13, zone: "quai_lac", x: 352, y: 304 },
    { start: 13, end: 21, zone: "criques", x: 208, y: 288 }
  ], chatter: [
    "Deux rubis la traversée. Le lac ne fait pas crédit.",
    "J'ai ramé avant que vous ne sachiez marcher.",
    "Une barque à soi, c'est bien. Un passeur, c'est mieux renseigné.",
    "Le fond du lac garde des choses. N'y regardez pas trop."
  ]},

  { id: "soeur_aubel", name: "Sœur Aubel", color: "leaf", schedule: [
    { start: 5, end: 12, zone: "verger_haut", x: 224, y: 240 },
    { start: 12, end: 20, zone: "vergers_est", x: 272, y: 208 },
    { start: 20, end: 24, zone: "verger_haut", x: 224, y: 240 }
  ], chatter: [
    "Je soigne. Je ne juge pas. C'est déjà beaucoup de travail.",
    "Trois fleurs-œil valent une potion. Le calcul est honnête.",
    "Le verger de nuit ne donne qu'à ceux qui attendent la nuit.",
    "Un remède mal payé guérit moins bien. Personne ne sait pourquoi."
  ]},

  /**
   * Odile relève les mêmes régions que vous, en avance. Elle sert de mesure :
   * son avance se calcule sur le carnet, et elle le fait remarquer.
   */
  { id: "odile", name: "Odile la Rivale", color: "roof", schedule: [
    { start: 7, end: 12, zone: "lisiere_carrefour", x: 224, y: 128 },
    { start: 12, end: 17, zone: "riviere_pont", x: 256, y: 208 },
    { start: 17, end: 23, zone: "place_puits", x: 96, y: 240 }
  ], chatter: [
    "Vous relevez encore à pied ? Charmant.",
    "J'ai vendu ma carte de la Lisière avant que vous n'y entriez.",
    "Un blanc sur une carte, c'est un aveu.",
    "Nous ferions une bonne équipe. C'est bien le problème."
  ]},

  { id: "maitre_pigeon", name: "Colombin", color: "stone", schedule: [
    { start: 0, end: 24, zone: "hameau_nord", x: 352, y: 288 }
  ], chatter: [
    "Roucoule. Le pigeon, pas moi.",
    "Une lettre part le matin, revient le lendemain. C'est la poste.",
    "Mes bêtes ne se perdent jamais. Les gens, si.",
    "Confiez-moi un objet, je vous trouve à qui il manque."
  ]}
] as const satisfies readonly NpcData[];
