# Schémas de données

Les cartes suivent un sous-ensemble documenté du format JSON de Tiled. Les PNJ,
dialogues, quêtes, ennemis, objets, boutiques et horaires sont chargés depuis
`src/data`. L'outil `npm run validate:data` contrôle les identifiants et références.

## Cartes

Une carte fait 16×14 tuiles de 16 px et expose exactement quatre couches :
`ground`, `terrain`, `decor_below`, `decor_above`. Chaque couche contient 224
identifiants. Les propriétés solides, aquatiques, lentes, coupables et ledges
sont portées par `TileSet`.

## PNJ

Chaque PNJ possède un identifiant, un nom, une couleur de sprite, au moins quatre
bavardages et un ou plusieurs créneaux `{start, end, zone, x, y}`. Les dialogues
conditionnels sont évalués dans l'ordre et la première entrée valide gagne.

## Quêtes

Une quête déclare `id`, `title`, `giver`, `prerequisites`, `steps`, `rewards` et
`worldEffects`. Les étapes acceptent `flag`, `talkTo`, `collect`, `defeat` et
`choice`. Aucun identifiant de contenu n'est codé dans le moteur de quête.

## Validation

`npm run validate:data` vérifie la limite de palette, les doublons, les quatre
couches des cartes, leur taille et toutes les références de zones des PNJ,
ennemis et objets.
