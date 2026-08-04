# Vallée de Bruyère

La vallée forme une grille de 8×7 régions de 32×28 tuiles, soit 512×448 pixels
chacune. La Place du Puits [3,3] est le point de départ. La forêt s'étend au
nord-ouest, les Marches de Pierre au nord-est, le Lac Miroir au sud et le Canal
Tari au sud-est.

## Douze milieux

| Biome | Sol dominant | Ce qu'on y trouve |
| --- | --- | --- |
| `village` | herbe et terre battue | place pavée, maisons, potagers, lanternes |
| `fields` | chaume doré | parcelles closes de haies, blé, meules |
| `forest` | sous-bois | bosquets denses, clairières, fougères, souches |
| `peaks` | névé, éboulis | gradins rocheux percés de cols, congères |
| `cliffs` | roche nue | terrasses, blocs erratiques, sentiers de gravier |
| `ruins` | pavage ancien | colonnades, arches, moellons envahis |
| `marsh` | tourbe | mares peu profondes, arbres morts, massettes |
| `reeds` | vase | roselières, pontons |
| `lake` | sable de rive | grande étendue d'eau, ponton, nénuphars |
| `river` | herbe et grève | cours d'eau serpentant, gué de planches |
| `canal` | dalles fendues | bajoyers de pierre, chenal, vannes |
| `witch` | bruyère | arbres morts, champignons, pierres levées |

Le sol d'une région se fond dans celui de ses voisines sur quatre tuiles : on
ne franchit jamais une couture nette entre deux papiers peints.

## Passages

Chaque frontière entre deux régions porte une ouverture unique, calculée depuis
l'identité de la frontière elle-même : les deux régions mitoyennes lisent le
même nombre, donc percent leur ceinture au même endroit. Une route élargit le
passage à neuf tuiles, un simple sentier à sept.

## Danger

Chaque région porte un niveau de menace de 0 à 3 qui gouverne son peuplement
automatique. Les refuges (village, quai, îlot, tour) restent vides ; les
sommets, la canopée dense, le marais noir et le canal profond sont hostiles.
La faune est propre au milieu et se renouvelle chaque matin — la nuit ajoute
une créature.

## Lieux remarquables

- **Place du Puits** [3,3] — puits de soin, de sauvegarde et de renaissance.
- **Carrefour Creux** [2,2] — étal du Colporteur, chaudron d'Îris.
- **Château de Cendre** [5,2] — Gardes de Cendre, Crâne du Demi-Démon.
- **Tour de Lune** [0,2] — Maëlis et le Chat-Lanterne.
- **Ermitage de Gorm** [7,2] — Gorm, et ce qu'il sait de la Cime.
- **La Cime Errante** [7,0] — plateau dallé, arène de l'Arbre-Mère.

Les changements majeurs sont persistants : retour de la source, rivière en eau,
forêt reconfigurée, passage vers les Marches, trois sceaux, niveau haut du lac,
moulin en marche et deux états post-game.
