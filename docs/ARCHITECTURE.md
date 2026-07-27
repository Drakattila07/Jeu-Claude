# Architecture

Les Racines Creuses est un jeu Canvas 2D à résolution interne fixe de 256×224.
Le moteur (`src/core`, `src/world`, `src/entities`, `src/systems`, `src/ui`) ne
contient aucune donnée narrative. Le contenu est déclaré dans `src/data`.

La simulation avance à 60 images par seconde avec un accumulateur. Toute durée de
gameplay est exprimée en frames. Les tirages aléatoires utilisent le RNG seedé du
jeu afin qu'une seed et une séquence d'actions reproduisent le même état.
