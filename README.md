# Les Racines Creuses

Action-RPG 2D top-down en TypeScript strict et Canvas 2D pur, inspiré du rythme
des aventures 16-bit sans en reprendre les graphismes. La Vallée de Bruyère
s'assèche ; une jeune cartographe doit restaurer son ancien réseau d'irrigation
et comprendre pourquoi les arbres se sont mis à marcher.

## Jouer

- Flèches ou WASD : marcher
- X : parler et agir
- Espace : utiliser l'épée
- Maj : activer ou quitter la forme demi-démon après avoir obtenu le Crâne
- C : objet / pêche
- Entrée : sac, carte et quête

Le puits devient un point de soin et de sauvegarde après l'ouverture de la
source. Trois slots sont pris en charge par le moteur de sauvegarde.

## Développement

`npm run dev` lance le jeu. `npm test`, `npm run build`,
`npm run validate:data` et `npm run screenshot -- 180` assurent la validation.

La vallée occupe toute une grille de 8×7 écrans, soit 56 zones explorables.
Les limites extérieures bloquent le personnage au lieu de le téléporter de
l'autre côté.
