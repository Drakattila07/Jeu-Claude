export const DIALOGUES = {
  elder_intro: [
    { when: { flagMissing: "act1_complete" }, text: "Le puits se tait. Va voir la source, au nord de la forêt." },
    { when: { flag: "act1_complete" }, text: "Écoute… L'eau chante de nouveau sous les pierres." },
    { when: {}, text: "Une carte ne dit pas seulement où aller. Elle dit ce qui mérite d'être sauvé." }
  ],
  mira_default: [
    { when: { weather: "rain" }, text: "La pluie réveille les racines. Et les souvenirs." },
    { when: { night: true }, text: "Ma boutique dort. Les plantes, jamais." },
    { when: {}, text: "Une feuille froissée peut encore devenir un remède." }
  ],
  bram_default: [
    { when: { flag: "source_open" }, text: "L'eau est revenue. Mon marteau avait oublié ce son." },
    { when: {}, text: "Une lame n'est qu'une promesse tant qu'elle n'a rien protégé." }
  ]
} as const;

export type DialogueId = keyof typeof DIALOGUES;
