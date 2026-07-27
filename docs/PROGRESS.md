# Progression

## T01 — Fondations ✅

- Vite, TypeScript strict et Vitest
- Boucle déterministe à pas fixe 60 Hz
- Canvas 256×224 et upscale entier ×1 à ×4
- Entrées abstraites clavier
- Écran de contrôle et tests du pas de temps

## T02 — Tilemap ✅

- TileSet procédural respectant la palette globale
- Chargement d'une carte JSON au format Tiled
- Quatre couches et `decor_above` rendu en dernier
- Place du Puits [3,3] jouable comme carte de référence

## T03 — Joueur et collisions ✅

- Marche 4 directions à 1,5 px/frame et animation 4 frames
- AABB contre la grille solide, diagonales normalisées
- Correction de coin jusqu'à 4 px
- Tests du glissement et de la reproductibilité
