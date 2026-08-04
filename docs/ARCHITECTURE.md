# Architecture

Les Racines Creuses est un jeu Canvas 2D à résolution interne fixe de 384×216,
agrandie d'un facteur entier. Le moteur (`src/core`, `src/world`,
`src/entities`, `src/systems`, `src/ui`) ne contient aucune donnée narrative :
le contenu est déclaré dans `src/data`.

La simulation avance à 60 images par seconde avec un accumulateur. Toute durée
de gameplay est exprimée en frames. Les tirages aléatoires utilisent le bruit
seedé du monde afin qu'une graine et une séquence d'actions reproduisent le
même état.

## Géométrie

| | valeur |
| --- | --- |
| Fenêtre de rendu | 384 × 216 px |
| Tuile | 16 px |
| Région | 32 × 28 tuiles, soit 512 × 448 px |
| Grille du monde | 8 × 7 régions |
| Intérieur | 24 × 14 tuiles, soit 384 × 224 px |

La caméra défile à l'intérieur de la carte courante. Elle connaît les
dimensions de cette carte (`Camera.setBounds`) : c'est `Game.useMap` qui recale
d'un même geste le personnage, l'éclairage et la caméra à chaque changement de
carte.

## Flux principal

`Game` orchestre l'entrée, la simulation, les systèmes et le rendu.
`ZoneRegistry` et `ZoneVariants` choisissent le contenu déclaré dans
`src/data`. Les entités sont recréées à chaque changement de région, tandis que
`Flags`, `QuestSystem`, `ZoneObjectState`, `Inventory` et `MapScreen` portent
l'état persistant.

Ordre de rendu :

```
sol + relief (tampon pré-rendu)  →  entités triées par profondeur
  →  canopée  →  incendies  →  projectiles  →  particules  →  texte flottant
  →  éclairage (multiply)  →  météo  →  vignette  →  interface
```

Les couches fixes d'une carte sont composées **une seule fois** dans un tampon
hors écran, puis recopiées d'un `drawImage` : seules les tuiles réellement
animées (eau, flammes, herbes) sont repeintes à chaque image.

## Génération du monde

`world/WorldGen.ts` construit d'abord le modèle macroscopique de la vallée :

- **Passages.** Chaque frontière est identifiée de la même façon vue des deux
  côtés, si bien que les deux régions mitoyennes tirent leur ouverture du même
  nombre — donc au même endroit. C'est l'invariant qui rend le monde
  traversable.
- **Routes.** Un arbre couvrant de poids minimal relie les 56 régions, pondéré
  par la difficulté de traversée de chaque biome : la route évite d'elle-même
  marais et sommets. Quelques arêtes supplémentaires créent des boucles.
- **Eau.** Deux régions aquatiques mitoyennes partagent un cours d'eau.

`world/ZoneMapFactory.ts` dessine ensuite chaque région : sol au bruit fractal,
ceinture percée aux passages, couloirs vers le cœur, cours d'eau, aménagement
propre au biome, lieu remarquable, semis d'obstacles, puis **réparation de la
connexité** — un parcours en largeur vérifie que toutes les sorties, le cœur de
la région et chaque point de contenu communiquent, et perce un couloir sinon.

## Éclairage

`systems/Lighting.ts` remplit un tampon de la couleur ambiante du moment
(courbe interpolée sur la journée, teintée par le biome et la météo), y ajoute
les halos des sources, puis multiplie le tout sur la scène. Les sources fixes
sont relevées une fois par carte depuis la propriété `light` des tuiles ; les
sources mobiles (personnage, projectiles, familier) sont fournies par frame.

## Déterminisme

- simulation à 60 Hz exactement ;
- durées de gameplay en frames ;
- bruit de valeur seedé, sans état global ;
- météo, pêche, peuplement journalier et IA sans horloge murale ;
- outil de capture capable d'arrêter la boucle et d'avancer un nombre précis de
  frames, et automate de test capable de rejouer la même partie.
