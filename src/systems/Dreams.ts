/**
 * Les rêves.
 *
 * Dormir faisait passer la nuit et rien d'autre. Un lit est pourtant le seul
 * endroit où l'on peut souffler assez longtemps pour comprendre où l'on en
 * est : le rêve dit l'objectif courant autrement que la liste de quêtes, et
 * finit toujours par une image plutôt que par une consigne.
 */

export interface Dream {
  /** Drapeau qui doit être posé pour que ce rêve soit d'actualité. */
  readonly needs?: string;
  /** Drapeau qui l'a rendu caduc. */
  readonly until?: string;
  readonly title: string;
  readonly text: string;
}

const DREAMS: readonly Dream[] = [
  {
    until: "source_open",
    title: "Rêve du seau vide",
    text: "Vous descendez le seau et il remonte plein de poussière blanche. "
      + "Au fond du puits, quelqu'un tousse. Vous vous réveillez la gorge sèche.",
  },
  {
    needs: "source_open", until: "mechanism_repaired",
    title: "Rêve de la roue",
    text: "Une grande roue de bronze tourne dans le noir, sans eau, sans bruit. "
      + "Elle attend une main. Vous tendez la vôtre et elle est trop petite.",
  },
  {
    needs: "mechanism_repaired", until: "boss_defeated",
    title: "Rêve de l'arbre qui marche",
    text: "Un arbre traverse la vallée en enjambant les toits. Il ne renverse rien. "
      + "Il se retourne, et vous comprenez qu'il vous attendait depuis longtemps.",
  },
  {
    needs: "boss_defeated", until: "boat",
    title: "Rêve du sel",
    text: "Le lac déborde et devient salé. Une coque bâille sur le sable, "
      + "les bordés écartés comme des côtes. Quelqu'un siffle un air de saule.",
  },
  {
    needs: "boat", until: "dragon_calmed",
    title: "Rêve de la fumée",
    text: "Au sud, une montagne respire. À chaque expiration, la mer recule d'une lieue. "
      + "Vous notez la chose au carnet, en rêve, et l'encre s'évapore.",
  },
  {
    needs: "dragon_calmed",
    title: "Rêve de la marge blanche",
    text: "Votre carte est finie. Dans la marge, une main que vous ne reconnaissez pas "
      + "a écrit : « et après ? ». L'écriture ressemble beaucoup à la vôtre.",
  },
];

/** Le rêve qui correspond à l'avancement. Il y en a toujours un. */
export function dreamFor(hasFlag: (flag: string) => boolean): Dream {
  return DREAMS.find((dream) =>
    (dream.needs === undefined || hasFlag(dream.needs))
    && (dream.until === undefined || !hasFlag(dream.until)))
    ?? DREAMS[DREAMS.length - 1]!;
}

export const ALL_DREAMS: readonly Dream[] = DREAMS;
