# Architecture

Les Racines Creuses est un jeu Canvas 2D à résolution interne fixe de 256×224.
Le moteur (`src/core`, `src/world`, `src/entities`, `src/systems`, `src/ui`) ne
contient aucune donnée narrative. Le contenu est déclaré dans `src/data`.

La simulation avance à 60 images par seconde avec un accumulateur. Toute durée de
gameplay est exprimée en frames. Les tirages aléatoires utilisent le RNG seedé du
jeu afin qu'une seed et une séquence d'actions reproduisent le même état.

## Flux principal

`Game` orchestre l'entrée, la simulation, les systèmes et le rendu sans contenir
de données narratives. `ZoneRegistry` et `ZoneVariants` choisissent le contenu
déclaré dans `src/data`. Les entités sont recréées à chaque changement d'écran,
tandis que `Flags`, `QuestSystem`, `ZoneObjectState`, `Inventory` et `MapScreen`
portent l'état persistant.

Le rendu suit l'ordre `ground → terrain → decor_below → entités →
decor_above → environnement → HUD → interfaces`. Tous les pixels visibles
proviennent de la palette globale de 32 couleurs.

## Déterminisme

- simulation à 60 Hz exactement ;
- durées de gameplay en frames ;
- RNG `mulberry32` seedé ;
- météo, pêche, spawns journaliers et IA sans horloge murale ;
- outil de capture capable d'arrêter la boucle et d'avancer un nombre précis de frames.
