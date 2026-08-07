/**
 * La Chronique de la Vallée.
 *
 * Douze feuillets dispersés, lisibles une fois rapportés à la Bibliothèque
 * Noyée. Ils racontent pourquoi le canal a été bâti, pourquoi on l'a laissé
 * mourir, et ce que les arbres ont à voir là-dedans — la seule chose que le
 * jeu ne disait nulle part, et qui donne son sens à tout le reste.
 */

export interface ChroniclePage {
  readonly number: number;
  readonly title: string;
  /** Région où le feuillet se trouve. */
  readonly zone: string;
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

export const CHRONICLE: readonly ChroniclePage[] = [
  {
    number: 1, title: "De l'eau, d'abord", zone: "place_puits", x: 112, y: 320,
    text: "« On n'a pas fondé la Vallée. On a trouvé une source et on s'est assis autour. "
      + "Tout le reste — les maisons, les noms, les querelles — est venu après, et par elle. »",
  },
  {
    number: 2, title: "Le premier canal", zone: "canal_entry", x: 176, y: 320,
    text: "« Quarante hommes, deux étés. On a percé la roche pour que l'eau aille où "
      + "elle n'allait pas. Personne n'a demandé si elle en avait envie. »",
  },
  {
    number: 3, title: "Les Trois Sceaux", zone: "marches_ruines", x: 96, y: 128,
    text: "« Bloc, Regard, Rythme. Trois serrures pour une seule porte, parce qu'un "
      + "seul homme ne devait jamais pouvoir refermer le canal. On a bien fait. »",
  },
  {
    number: 4, title: "Ce qui marche", zone: "bosquet_souches", x: 96, y: 96,
    text: "« Un bûcheron jure qu'une souche l'a suivi. On a ri. Le lendemain, la souche "
      + "était à l'entrée du village, et le bûcheron n'a plus jamais coupé. »",
  },
  {
    number: 5, title: "L'Arbre-Mère", zone: "clairiere_cimes", x: 352, y: 128,
    text: "« Elle était déjà vieille quand la source était jeune. Les racines de la vallée "
      + "sont les siennes. Détourner l'eau, c'était lui trancher les doigts un par un. »",
  },
  {
    number: 6, title: "La sécheresse", zone: "champs_ouest", x: 128, y: 288,
    text: "« La troisième année sans pluie, on a compris que ce n'était pas le ciel. "
      + "Quelque chose buvait avant nous, et ce quelque chose avait des raisons. »",
  },
  {
    number: 7, title: "Le Château de Cendre", zone: "portail_scelle", x: 384, y: 288,
    text: "« Ils ont brûlé la moitié du bois pour forcer les Sceaux. Il en reste un nom, "
      + "des murs noirs, et une relique que personne n'aurait dû garder. »",
  },
  {
    number: 8, title: "Vertepierre", zone: "avant_cour", x: 128, y: 224,
    text: "« La forteresse ne gardait pas la vallée. Elle gardait la carte du large, "
      + "pour que nul ne parte avant d'avoir réparé ce qu'il avait cassé ici. »",
  },
  {
    number: 9, title: "Le sel", zone: "greve_de_maree", x: 128, y: 208,
    text: "« On a longtemps cru la mer hostile. Elle rend deux fois par jour ce qu'elle "
      + "prend. C'est plus qu'aucun d'entre nous n'a jamais fait. »",
  },
  {
    number: 10, title: "Le Volcan", zone: "ile_du_volcan", x: 240, y: 288,
    text: "« Trois bateaux sont partis vers la fumée. Le dernier a renvoyé une écaille "
      + "et un mot : "
      + "« il ne dort pas, il attend qu'on lui rende quelque chose ». »",
  },
  {
    number: 11, title: "Les cartographes", zone: "cabane_iris", x: 128, y: 288,
    text: "« Une carte n'est pas un dessin du monde. C'est la liste de ce qu'on a "
      + "consenti à voir. Relis les tiennes en pensant à ça. »",
  },
  {
    number: 12, title: "Marge blanche", zone: "boss_arena", x: 96, y: 352,
    text: "« Ici s'arrête ce que je sais. La suite appartient à celle qui lira ces pages "
      + "— si elle a le courage de les rapporter toutes. »",
  },
];

export function pageAt(zoneId: string): readonly ChroniclePage[] {
  return CHRONICLE.filter((page) => page.zone === zoneId);
}

export const CHRONICLE_TOTAL = CHRONICLE.length;
